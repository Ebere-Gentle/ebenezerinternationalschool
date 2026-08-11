import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "npm:jszip";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? "";

const SUPABASE_ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const BACKUP_ENCRYPTION_KEY =
  Deno.env.get("BACKUP_ENCRYPTION_KEY") ?? "";

const BACKUP_BUCKET = "school_backups";

/* =========================================================
   TABLES
========================================================= */

const BRANCH_TABLES = [
  "academic_calendar",
  "academic_sessions",
  "activity_logs",
  "admission_sequences",
  "announcements",
  "budget",
  "bus_routes",
  "classes",
  "clubs",
  "expenses",
  "fee_categories",
  "fee_exemptions",
  "fee_groups",
  "fee_templates",
  "fees",
  "houses",
  "inventory_items",
  "opening_balances",
  "parents",
  "payment_gateways",
  "payments",
  "reports",
  "student_fee_assignments",
  "student_promotions",
  "students",
  "subjects",
  "teachers",
  "terms",
  "users",
] as const;

const APPLICATION_BUCKETS = [
  "payment-proofs",
  "payment-receipts",
  "signatures",
  "student-documents",
  "student-photos",
] as const;

/* =========================================================
   RESPONSE
========================================================= */

function jsonResponse(
  data: unknown,
  status = 200,
) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type":
          "application/json",
      },
    },
  );
}

/* =========================================================
   FILENAME
========================================================= */

function sanitizeFileName(
  value: string,
): string {
  return value
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100);
}

/* =========================================================
   ENCRYPT BACKUP
========================================================= */

async function encryptBackup(
  data: Uint8Array,
  secret: string,
): Promise<Uint8Array> {
  const encoder =
    new TextEncoder();

  const secretHash =
    await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(secret),
    );

  const key =
    await crypto.subtle.importKey(
      "raw",
      secretHash,
      {
        name: "AES-GCM",
        length: 256,
      },
      false,
      ["encrypt"],
    );

  const iv =
    crypto.getRandomValues(
      new Uint8Array(12),
    );

  const encrypted =
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
      },
      key,
      data,
    );

  const result =
    new Uint8Array(
      iv.length +
        encrypted.byteLength,
    );

  result.set(iv, 0);

  result.set(
    new Uint8Array(encrypted),
    iv.length,
  );

  return result;
}

/* =========================================================
   FETCH BRANCH TABLE
========================================================= */

async function fetchBranchTable(
  adminClient: any,
  tableName: string,
  branchId: string,
): Promise<Record<string, unknown>[]> {
  const rows: Record<
    string,
    unknown
  >[] = [];

  const PAGE_SIZE = 1000;

  let offset = 0;

  while (true) {
    const {
      data,
      error,
    } = await adminClient
      .from(tableName)
      .select("*")
      .eq("branch_id", branchId)
      .range(
        offset,
        offset + PAGE_SIZE - 1,
      );

    if (error) {
      throw new Error(
        `Failed exporting ${tableName}: ${error.message}`,
      );
    }

    if (
      !data ||
      data.length === 0
    ) {
      break;
    }

    rows.push(
      ...(data as Record<
        string,
        unknown
      >[]),
    );

    if (
      data.length <
      PAGE_SIZE
    ) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return rows;
}

/* =========================================================
   PAYMENT IDS
========================================================= */

async function getBranchPaymentIds(
  adminClient: any,
  branchId: string,
): Promise<string[]> {
  const ids: string[] = [];

  const PAGE_SIZE = 1000;

  let offset = 0;

  while (true) {
    const {
      data,
      error,
    } = await adminClient
      .from("payments")
      .select("id")
      .eq("branch_id", branchId)
      .range(
        offset,
        offset + PAGE_SIZE - 1,
      );

    if (error) {
      console.warn(
        "Could not read payment IDs:",
        error.message,
      );

      break;
    }

    if (
      !data ||
      data.length === 0
    ) {
      break;
    }

    for (const payment of data) {
      if (payment?.id) {
        ids.push(
          String(payment.id),
        );
      }
    }

    if (
      data.length <
      PAGE_SIZE
    ) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return ids;
}

/* =========================================================
   STORAGE RECURSIVE LIST
========================================================= */

async function listFilesRecursively(
  adminClient: any,
  bucket: string,
  folder = "",
): Promise<string[]> {
  const files: string[] = [];

  const PAGE_SIZE = 1000;

  let offset = 0;

  while (true) {
    const {
      data,
      error,
    } = await adminClient.storage
      .from(bucket)
      .list(folder, {
        limit: PAGE_SIZE,
        offset,
        sortBy: {
          column: "name",
          order: "asc",
        },
      });

    if (error) {
      console.warn(
        `Could not list ${bucket}/${folder}:`,
        error.message,
      );

      break;
    }

    if (
      !data ||
      data.length === 0
    ) {
      break;
    }

    for (const item of data) {
      const currentPath =
        folder
          ? `${folder}/${item.name}`
          : item.name;

      if (item.id) {
        files.push(currentPath);
      } else {
        const nested =
          await listFilesRecursively(
            adminClient,
            bucket,
            currentPath,
          );

        files.push(
          ...nested,
        );
      }
    }

    if (
      data.length <
      PAGE_SIZE
    ) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return files;
}

/* =========================================================
   STORAGE OWNERSHIP
========================================================= */

function isBranchOwnedStoragePath(
  path: string,
  branchId: string,
  paymentIds: Set<string>,
): boolean {
  const parts =
    path.split("/");

  if (
    parts.includes(branchId)
  ) {
    return true;
  }

  for (
    const paymentId of paymentIds
  ) {
    if (
      parts.includes(paymentId)
    ) {
      return true;
    }
  }

  return false;
}

/* =========================================================
   ADD STORAGE FILE
========================================================= */

async function addStorageFile(
  adminClient: any,
  bucket: string,
  path: string,
  zip: JSZip,
): Promise<boolean> {
  const {
    data,
    error,
  } = await adminClient.storage
    .from(bucket)
    .download(path);

  if (
    error ||
    !data
  ) {
    console.warn(
      `Could not download ${bucket}/${path}:`,
      error?.message ??
        "Unknown storage error",
    );

    return false;
  }

  const buffer =
    await data.arrayBuffer();

  zip.file(
    `storage/${bucket}/${path}`,
    buffer,
  );

  return true;
}

/* =========================================================
   MAIN FUNCTION
========================================================= */

Deno.serve(
  async (req) => {
    /* -----------------------------------------------------
       CORS
    ----------------------------------------------------- */

    if (
      req.method ===
      "OPTIONS"
    ) {
      return new Response(
        "ok",
        {
          headers:
            corsHeaders,
        },
      );
    }

    if (
      req.method !==
      "POST"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Only POST requests are allowed.",
        },
        405,
      );
    }

    let backupId:
      string | null = null;

    try {
      /* ===================================================
         ENVIRONMENT
      =================================================== */

      if (!SUPABASE_URL) {
        throw new Error(
          "SUPABASE_URL is not configured.",
        );
      }

      if (!SUPABASE_ANON_KEY) {
        throw new Error(
          "SUPABASE_ANON_KEY is not configured.",
        );
      }

      if (
        !SUPABASE_SERVICE_ROLE_KEY
      ) {
        throw new Error(
          "SUPABASE_SERVICE_ROLE_KEY is not configured.",
        );
      }

      if (
        !BACKUP_ENCRYPTION_KEY
      ) {
        throw new Error(
          "BACKUP_ENCRYPTION_KEY is not configured.",
        );
      }

      /* ===================================================
         AUTHENTICATION
      =================================================== */

      const authorization =
        req.headers.get(
          "Authorization",
        );

      if (!authorization) {
        return jsonResponse(
          {
            success: false,
            error:
              "Authentication required.",
          },
          401,
        );
      }

      const userClient =
        createClient(
          SUPABASE_URL,
          SUPABASE_ANON_KEY,
          {
            global: {
              headers: {
                Authorization:
                  authorization,
              },
            },
          },
        );

      const {
        data: authData,
        error: authError,
      } =
        await userClient.auth.getUser();

      if (
        authError ||
        !authData?.user
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              authError?.message ??
              "Invalid authentication session.",
          },
          401,
        );
      }

      const authenticatedUser =
        authData.user;

      const authenticatedUserId =
        String(
          authenticatedUser.id,
        );

      console.log(
        "Authenticated user:",
        authenticatedUserId,
      );

      /* ===================================================
         ADMIN CLIENT
      =================================================== */

      const adminClient =
        createClient(
          SUPABASE_URL,
          SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              persistSession:
                false,
              autoRefreshToken:
                false,
            },
          },
        );

      /* ===================================================
         FIND USER PROFILE
         
         IMPORTANT:
         public.users.user_id is VARCHAR.
         auth.users.id is UUID.
         
         Therefore compare using String(user.id).
      =================================================== */

      const {
        data: userRecord,
        error: userError,
      } =
        await adminClient
          .from("users")
          .select(
            "id, user_id, email, first_name, last_name, role, branch_id, is_active",
          )
          .eq(
            "user_id",
            authenticatedUserId,
          )
          .maybeSingle();

      if (userError) {
        throw new Error(
          `Unable to determine user's branch: ${userError.message}`,
        );
      }

      /*
       * DO NOT access userRecord.id before
       * checking that userRecord exists.
       */

      if (!userRecord) {
        console.error(
          "No users record found for authenticated user:",
          authenticatedUserId,
        );

        return jsonResponse(
          {
            success: false,
            error:
              `No users record was found for authenticated user ${authenticatedUserId}.`,
            authenticated_user_id:
              authenticatedUserId,
          },
          403,
        );
      }

      console.log(
        "Application user:",
        {
          id: userRecord.id,
          user_id:
            userRecord.user_id,
          branch_id:
            userRecord.branch_id,
          role: userRecord.role,
        },
      );

      /* ===================================================
         BRANCH
      =================================================== */

      if (
        !userRecord.branch_id
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "Your user account exists, but it is not assigned to a school branch.",
          },
          403,
        );
      }

      const branchId =
        String(
          userRecord.branch_id,
        );

      /* ===================================================
         LOAD BRANCH
      =================================================== */

      const {
        data: branch,
        error: branchError,
      } =
        await adminClient
          .from("branches")
          .select("*")
          .eq(
            "id",
            branchId,
          )
          .maybeSingle();

      if (branchError) {
        throw new Error(
          `Unable to load branch: ${branchError.message}`,
        );
      }

      if (!branch) {
        throw new Error(
          `Branch ${branchId} was not found.`,
        );
      }

      /* ===================================================
         FILE NAME
      =================================================== */

      const timestamp =
        new Date()
          .toISOString()
          .replace(
            /[:.]/g,
            "-",
          );

      const safeSchoolName =
        sanitizeFileName(
          String(
            branch.school_name ??
              branch.branch_code ??
              "school",
          ),
        );

      const fileName =
        `${safeSchoolName}_backup_${timestamp}.backup`;

      const filePath =
        `${branchId}/${fileName}`;

      console.log(
        "Backup file:",
        filePath,
      );

      /* ===================================================
         CREATE BACKUP DATABASE RECORD
      =================================================== */

      const {
        data: backupRecord,
        error:
          backupInsertError,
      } =
        await adminClient
          .from(
            "school_backups",
          )
          .insert({
            branch_id:
              branchId,

            /*
             * This is the auth.users UUID.
             * Your column is UUID and nullable.
             */
            created_by:
              authenticatedUserId,

            file_name:
              fileName,

            file_path:
              filePath,

            status:
              "creating",

            backup_version:
              "1.0",

            tables_backed_up:
              0,

            records_backed_up:
              0,

            storage_files_backed_up:
              0,

            metadata: {
              application:
                "360CloudSchool",
              initiated_by:
                authenticatedUserId,
              initiated_by_email:
                authenticatedUser.email ??
                userRecord.email ??
                null,
            },
          })
          .select("*")
          .single();

      if (
        backupInsertError
      ) {
        throw new Error(
          `Unable to create backup record: ${backupInsertError.message}`,
        );
      }

      if (!backupRecord) {
        throw new Error(
          "Backup record was not returned after insertion.",
        );
      }

      backupId =
        backupRecord.id;

      console.log(
        "Backup record created:",
        backupId,
      );

      /* ===================================================
         CREATE ZIP
      =================================================== */

      const zip =
        new JSZip();

      zip.file(
        "manifest.json",
        JSON.stringify(
          {
            backup_version:
              "1.0",

            application:
              "360CloudSchool",

            backup_type:
              "complete_school_backup",

            created_at:
              new Date().toISOString(),

            branch_id:
              branchId,

            branch_code:
              branch.branch_code ??
              null,

            school_name:
              branch.school_name ??
              null,

            created_by:
              authenticatedUserId,

            created_by_email:
              authenticatedUser.email ??
              userRecord.email ??
              null,

            database_tables:
              BRANCH_TABLES,

            storage_buckets:
              APPLICATION_BUCKETS,
          },
          null,
          2,
        ),
      );

      zip.file(
        "database/branches.json",
        JSON.stringify(
          [branch],
          null,
          2,
        ),
      );

      let totalRecords = 1;
      let tablesBackedUp = 1;

      /* ===================================================
         DATABASE TABLES
      =================================================== */

      for (
        const tableName of BRANCH_TABLES
      ) {
        console.log(
          `Backing up table: ${tableName}`,
        );

        try {
          const rows =
            await fetchBranchTable(
              adminClient,
              tableName,
              branchId,
            );

          zip.file(
            `database/${tableName}.json`,
            JSON.stringify(
              rows,
              null,
              2,
            ),
          );

          totalRecords +=
            rows.length;

          tablesBackedUp++;

          console.log(
            `Completed ${tableName}: ${rows.length} records`,
          );
        } catch (
          tableError
        ) {
          console.error(
            `Table ${tableName} failed:`,
            tableError,
          );

          throw tableError;
        }
      }

      /* ===================================================
         SCHOOL INFO
      =================================================== */

      const {
        data: schoolInfo,
        error:
          schoolInfoError,
      } =
        await adminClient
          .from(
            "school_info",
          )
          .select("*")
          .eq(
            "school_id",
            branchId,
          );

      if (
        schoolInfoError
      ) {
        console.warn(
          "school_info export skipped:",
          schoolInfoError.message,
        );

        zip.file(
          "database/school_info.json",
          JSON.stringify(
            [],
            null,
            2,
          ),
        );
      } else {
        zip.file(
          "database/school_info.json",
          JSON.stringify(
            schoolInfo ??
              [],
            null,
            2,
          ),
        );

        totalRecords +=
          schoolInfo?.length ??
          0;
      }

      /* ===================================================
         PAYMENT IDS
      =================================================== */

      const paymentIds =
        await getBranchPaymentIds(
          adminClient,
          branchId,
        );

      const paymentIdSet =
        new Set<string>(
          paymentIds,
        );

      /* ===================================================
         STORAGE
      =================================================== */

      let storageFilesBackedUp =
        0;

      const storageManifest:
        Record<
          string,
          string[]
        > = {};

      for (
        const bucket of APPLICATION_BUCKETS
      ) {
        console.log(
          `Scanning storage bucket: ${bucket}`,
        );

        const files =
          await listFilesRecursively(
            adminClient,
            bucket,
          );

        const selectedFiles =
          files.filter(
            (path) =>
              isBranchOwnedStoragePath(
                path,
                branchId,
                paymentIdSet,
              ),
          );

        storageManifest[
          bucket
        ] = selectedFiles;

        console.log(
          `${bucket}: ${selectedFiles.length} branch-owned files`,
        );

        for (
          const path of selectedFiles
        ) {
          const added =
            await addStorageFile(
              adminClient,
              bucket,
              path,
              zip,
            );

          if (added) {
            storageFilesBackedUp++;
          }
        }
      }

      /* ===================================================
         STORAGE MANIFEST
      =================================================== */

      zip.file(
        "storage-manifest.json",
        JSON.stringify(
          storageManifest,
          null,
          2,
        ),
      );

      /* ===================================================
         SUMMARY
      =================================================== */

      zip.file(
        "backup-summary.json",
        JSON.stringify(
          {
            branch_id:
              branchId,

            school_name:
              branch.school_name,

            created_at:
              new Date().toISOString(),

            tables_backed_up:
              tablesBackedUp,

            records_backed_up:
              totalRecords,

            storage_files_backed_up:
              storageFilesBackedUp,

            payment_records_used_for_storage_matching:
              paymentIds.length,
          },
          null,
          2,
        ),
      );

      /* ===================================================
         GENERATE ZIP
      =================================================== */

      console.log(
        "Generating ZIP...",
      );

      const zipData =
        await zip.generateAsync(
          {
            type: "uint8array",
            compression:
              "DEFLATE",
            compressionOptions:
              {
                level: 6,
              },
          },
        );

      console.log(
        `ZIP generated: ${zipData.byteLength} bytes`,
      );

      /* ===================================================
         ENCRYPT
      =================================================== */

      console.log(
        "Encrypting backup...",
      );

      const encrypted =
        await encryptBackup(
          zipData,
          BACKUP_ENCRYPTION_KEY,
        );

      console.log(
        `Encrypted backup: ${encrypted.byteLength} bytes`,
      );

      /* ===================================================
         UPLOAD
      =================================================== */

      console.log(
        `Uploading ${filePath}...`,
      );

      const {
        error: uploadError,
      } =
        await adminClient.storage
          .from(
            BACKUP_BUCKET,
          )
          .upload(
            filePath,
            encrypted,
            {
              contentType:
                "application/octet-stream",
              upsert:
                false,
            },
          );

      if (uploadError) {
        throw new Error(
          `Backup upload failed: ${uploadError.message}`,
        );
      }

      /* ===================================================
         SIGNED URL
      =================================================== */

      const {
        data:
          signedUrlData,
        error:
          signedUrlError,
      } =
        await adminClient.storage
          .from(
            BACKUP_BUCKET,
          )
          .createSignedUrl(
            filePath,
            60 * 60,
          );

      if (
        signedUrlError ||
        !signedUrlData?.signedUrl
      ) {
        throw new Error(
          `Unable to create download URL: ${
            signedUrlError?.message ??
            "No signed URL returned."
          }`,
        );
      }

      /* ===================================================
         UPDATE BACKUP RECORD
      =================================================== */

      const {
        error:
          updateError,
      } =
        await adminClient
          .from(
            "school_backups",
          )
          .update({
            status:
              "completed",

            file_size:
              encrypted.byteLength,

            backup_version:
              "1.0",

            tables_backed_up:
              tablesBackedUp,

            records_backed_up:
              totalRecords,

            storage_files_backed_up:
              storageFilesBackedUp,

            completed_at:
              new Date().toISOString(),

            metadata: {
              backup_format:
                "encrypted_zip",

              encryption:
                "AES-256-GCM",

              storage_buckets:
                APPLICATION_BUCKETS,

              school_name:
                branch.school_name,

              created_by:
                authenticatedUserId,

              created_by_email:
                authenticatedUser.email ??
                userRecord.email ??
                null,
            },
          })
          .eq(
            "id",
            backupId,
          );

      if (
        updateError
      ) {
        console.warn(
          "Backup metadata update failed:",
          updateError.message,
        );
      }

      /* ===================================================
         SUCCESS
      =================================================== */

      console.log(
        `BACKUP COMPLETED: ${backupId}`,
      );

      return jsonResponse({
        success: true,

        backup: {
          id: backupId,

          branch_id:
            branchId,

          school_name:
            branch.school_name,

          file_name:
            fileName,

          file_path:
            filePath,

          file_size:
            encrypted.byteLength,

          tables_backed_up:
            tablesBackedUp,

          records_backed_up:
            totalRecords,

          storage_files_backed_up:
            storageFilesBackedUp,

          status:
            "completed",
        },

        download_url:
          signedUrlData.signedUrl,

        expires_in:
          3600,

        message:
          "Complete school backup created successfully.",
      });
    } catch (error) {
      /* ===================================================
         ERROR
      =================================================== */

      console.error(
        "CREATE SCHOOL BACKUP ERROR:",
        error,
      );

      const errorMessage =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        "BACKUP ERROR MESSAGE:",
        errorMessage,
      );

      /* ---------------------------------------------------
         Mark existing backup as failed
      --------------------------------------------------- */

      if (backupId) {
        try {
          const adminClient =
            createClient(
              SUPABASE_URL,
              SUPABASE_SERVICE_ROLE_KEY,
              {
                auth: {
                  persistSession:
                    false,
                  autoRefreshToken:
                    false,
                },
              },
            );

          await adminClient
            .from(
              "school_backups",
            )
            .update({
              status:
                "failed",

              error_message:
                errorMessage,

              completed_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              backupId,
            );
        } catch (
          updateError
        ) {
          console.error(
            "Could not mark backup as failed:",
            updateError,
          );
        }
      }

      return jsonResponse(
        {
          success: false,

          error:
            errorMessage,

          backup_id:
            backupId,

          message:
            "Backup creation failed. Existing school data was not deleted.",
        },
        500,
      );
    }
  },
);