import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { sendTransactionalEmail } from '../_shared/email.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const body = await req.json();
    const {
      email,
      password,
      first_name,
      last_name,
      middle_name,
      phone_number,
      address,
      occupation,
      employer,
      is_guardian,
      is_primary_contact,
      branch_id,
      created_by,
      student_ids,
      existing_parent_id,
    } = body;

    // --- VALIDATE REQUIRED FIELDS ---
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!first_name || !last_name) {
      return new Response(
        JSON.stringify({ error: 'First name and last name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!branch_id) {
      return new Response(
        JSON.stringify({ error: 'Branch ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- GENERATE PARENT ID ---
    const parentId = await generateParentId(supabaseAdmin, branch_id);

    // --- GENERATE USER ID ---
    const userId = await generateUserId(supabaseAdmin, branch_id);

    // --- CHECK IF EMAIL EXISTS ---
    const { data: existingParent } = await supabaseAdmin
      .from('parents')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingParent) {
      return new Response(
        JSON.stringify({ error: 'This email is already registered as a parent' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- CHECK IF USER ALREADY EXISTS ---
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let authUserId: string;
    let finalPassword = password || generateSecurePassword();
    let createdNewAuthUser = false;

    if (existingUser) {
      // User already exists, use existing user
      authUserId = existingUser.id;
      console.log('📝 Using existing user:', authUserId);
      
      // Update user record if needed
      await supabaseAdmin
        .from('users')
        .update({
          phone_number: phone_number || null,
          first_name: first_name,
          last_name: last_name,
          middle_name: middle_name || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUserId);
    } else {
      // --- CREATE AUTH USER ---
      console.log(`🔐 Creating auth user for parent: ${email}`);
      let authData;
      let authError;
      
      try {
        const result = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: finalPassword,
          email_confirm: true,
          user_metadata: {
            first_name: first_name,
            last_name: last_name,
            role: 'parent',
            branch_id: branch_id,
          },
        });
        authData = result.data;
        authError = result.error;
      } catch (err) {
        console.error('❌ Auth creation error:', err);
        return new Response(
          JSON.stringify({ error: 'Failed to create auth user', details: String(err) }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (authError || !authData?.user) {
        console.error('❌ Auth error:', authError);
        let errorMessage = 'Failed to create parent account';
        if (authError?.message?.includes('duplicate')) {
          errorMessage = 'This email is already registered. Please use a different email.';
        } else if (authError?.message?.includes('rate limit')) {
          errorMessage = 'Too many signup attempts. Please wait a moment and try again.';
        }
        return new Response(
          JSON.stringify({ error: errorMessage, details: authError?.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      authUserId = authData.user.id;
      createdNewAuthUser = true;
      console.log(`✅ Auth user created: ${authUserId}`);

      // --- CREATE USER RECORD ---
      console.log('📝 Creating user record...');
      const now = new Date().toISOString();
      
      const userData = {
        id: authUserId,
        user_id: userId,
        email: email,
        phone_number: phone_number || null,
        first_name: first_name,
        last_name: last_name,
        middle_name: middle_name || null,
        role: 'parent',
        branch_id: branch_id,
        is_active: true,
        created_by: created_by || authUserId,
        created_at: now,
        updated_at: now,
        metadata: {
          parent_id: parentId,
          created_via: 'parent_management',
          auth_user_created: true,
        },
      };

      const { error: userError } = await supabaseAdmin
        .from('users')
        .insert([userData]);

      if (userError) {
        console.error('❌ User record creation error:', userError);
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
        return new Response(
          JSON.stringify({ error: 'Failed to create user record', details: userError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // --- CREATE OR UPDATE PARENT RECORD ---
    const now = new Date().toISOString();
    
    if (existing_parent_id) {
      // Update existing parent
      console.log('📝 Updating existing parent record...');
      const { error: updateError } = await supabaseAdmin
        .from('parents')
        .update({
          user_id: authUserId,
          first_name: first_name,
          last_name: last_name,
          middle_name: middle_name || null,
          phone_number: phone_number || null,
          address: address || null,
          occupation: occupation || null,
          employer: employer || null,
          is_guardian: is_guardian || false,
          is_primary_contact: is_primary_contact !== false,
          updated_at: now,
          metadata: {
            created_via: 'parent_management',
            auth_user_created: true,
            auth_user_id: authUserId,
            auth_created_at: now,
            updated_by: created_by || authUserId,
          },
        })
        .eq('id', existing_parent_id);

      if (updateError) {
        console.error('❌ Update parent error:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update parent record', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get the parent record ID
      var parentRecordId = existing_parent_id;
    } else {
      // Create new parent record
      console.log('📝 Creating parent record...');
      const parentData = {
        parent_id: parentId,
        user_id: authUserId,
        first_name: first_name,
        last_name: last_name,
        middle_name: middle_name || null,
        email: email,
        phone_number: phone_number || null,
        address: address || null,
        occupation: occupation || null,
        employer: employer || null,
        is_guardian: is_guardian || false,
        is_primary_contact: is_primary_contact !== false,
        branch_id: branch_id,
        created_by: created_by || authUserId,
        created_at: now,
        updated_at: now,
        metadata: {
          created_via: 'parent_management',
          auth_user_created: true,
          auth_user_id: authUserId,
        },
      };

      const { data: createdParent, error: parentError } = await supabaseAdmin
        .from('parents')
        .insert([parentData])
        .select('id')
        .single();

      if (parentError) {
        console.error('❌ Parent record creation error:', parentError);
        if (!existingUser) {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
          await supabaseAdmin.from('users').delete().eq('id', authUserId);
        }
        return new Response(
          JSON.stringify({ error: 'Failed to create parent record', details: parentError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      var parentRecordId = createdParent?.id;
    }

    // --- LINK STUDENTS ---
    if (student_ids && student_ids.length > 0 && parentRecordId) {
      const { error: linkError } = await supabaseAdmin
        .from('students')
        .update({ parent_id: parentRecordId })
        .in('id', student_ids);

      if (linkError) {
        console.error('⚠️ Error linking students:', linkError);
        // Don't fail the whole process, just warn
      } else {
        console.log(`✅ Linked ${student_ids.length} students to parent`);
      }
    }

    // ============================================================
    // SEND PARENT PORTAL EMAIL
    // ============================================================

    let emailSent = false;
    let emailMessageId: string | null = null;
    let emailError: string | null = null;

    try {
      const portalUrl =
        'https://www.ebenezerinternationalschool.com.ng/login';

      const fullName =
        `${first_name} ${middle_name ? `${middle_name} ` : ''}${last_name}`.trim();

      const parentNumber = existing_parent_id
        ? existing_parent_id
        : parentId;

      if (createdNewAuthUser) {
        const subject =
          'Your Ebenezer International School Parent Portal Account';

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Parent Portal Account</title>
          </head>
          <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
            <div style="max-width:640px;margin:30px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
              <div style="background:#123b6d;padding:28px 30px;color:#ffffff;">
                <h1 style="margin:0;font-size:24px;">Ebenezer International School</h1>
                <p style="margin:8px 0 0;font-size:14px;opacity:.9;">Parent Portal Account</p>
              </div>

              <div style="padding:30px;">
                <h2 style="margin-top:0;">Welcome, ${escapeHtml(fullName)}</h2>

                <p>
                  Your Parent Portal account has been successfully created.
                  You can now access your child's school information online.
                </p>

                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin:24px 0;">
                  <p style="margin:0 0 10px;"><strong>Parent ID:</strong> ${escapeHtml(parentNumber)}</p>
                  <p style="margin:0 0 10px;"><strong>Email:</strong> ${escapeHtml(email)}</p>
                  <p style="margin:0;"><strong>Password:</strong> ${escapeHtml(finalPassword)}</p>
                </div>

                <div style="text-align:center;margin:28px 0;">
                  <a
                    href="${portalUrl}"
                    style="display:inline-block;background:#123b6d;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:8px;font-weight:bold;"
                  >
                    Open Parent Portal
                  </a>
                </div>

                <p style="font-size:13px;color:#64748b;">
                  For your security, please change your password after your first successful login
                  and do not share your login credentials with anyone.
                </p>

                <p style="margin-bottom:0;">
                  Regards,<br>
                  <strong>Ebenezer International School</strong>
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        const plainText = `
Ebenezer International School

Welcome, ${fullName}.

Your Parent Portal account has been created.

Parent ID: ${parentNumber}
Email: ${email}
Password: ${finalPassword}

Login:
${portalUrl}

For your security, please change your password after your first successful login and do not share your credentials.

Regards,
Ebenezer International School
        `.trim();

        const result = await sendTransactionalEmail({
          to: email,
          subject,
          html,
          text: plainText,
          sender: 'general',
        });

        emailSent = true;
        emailMessageId = result.messageId;

        console.log('📧 Parent welcome email sent', {
          recipient: email,
          messageId: result.messageId,
        });
      } else {
        const subject =
          'Ebenezer International School Parent Portal Access Updated';

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Parent Portal Access</title>
          </head>
          <body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
            <div style="max-width:640px;margin:30px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
              <div style="background:#123b6d;padding:28px 30px;color:#ffffff;">
                <h1 style="margin:0;font-size:24px;">Ebenezer International School</h1>
                <p style="margin:8px 0 0;font-size:14px;opacity:.9;">Parent Portal</p>
              </div>

              <div style="padding:30px;">
                <h2 style="margin-top:0;">Hello, ${escapeHtml(fullName)}</h2>

                <p>
                  Your Parent Portal access has been successfully enabled or updated.
                </p>

                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin:24px 0;">
                  <p style="margin:0 0 10px;"><strong>Parent ID:</strong> ${escapeHtml(parentNumber)}</p>
                  <p style="margin:0;"><strong>Email:</strong> ${escapeHtml(email)}</p>
                </div>

                <div style="text-align:center;margin:28px 0;">
                  <a
                    href="${portalUrl}"
                    style="display:inline-block;background:#123b6d;color:#ffffff;text-decoration:none;padding:13px 24px;border-radius:8px;font-weight:bold;"
                  >
                    Open Parent Portal
                  </a>
                </div>

                <p style="font-size:13px;color:#64748b;">
                  If you do not remember your password, please use the password-reset option
                  on the portal or contact the school.
                </p>

                <p style="margin-bottom:0;">
                  Regards,<br>
                  <strong>Ebenezer International School</strong>
                </p>
              </div>
            </div>
          </body>
          </html>
        `;

        const result = await sendTransactionalEmail({
          to: email,
          subject,
          html,
          text: `
Ebenezer International School

Hello ${fullName}.

Your Parent Portal access has been successfully enabled or updated.

Parent ID: ${parentNumber}
Email: ${email}

Login:
${portalUrl}

If you do not remember your password, use the password-reset option on the portal or contact the school.

Regards,
Ebenezer International School
          `.trim(),
          sender: 'general',
        });

        emailSent = true;
        emailMessageId = result.messageId;

        console.log('📧 Parent access email sent', {
          recipient: email,
          messageId: result.messageId,
        });
      }
    } catch (mailError) {
      const detailedEmailError =
        mailError instanceof Error
          ? mailError.message
          : String(mailError);

      console.error('⚠️ Parent email delivery failed:', {
        recipient: email,
        error: detailedEmailError,
      });

      emailError =
        'Welcome email could not be delivered. Please contact the school.';
    }

    console.log('✅ Parent registered successfully!');

    return new Response(
      JSON.stringify({
        success: true,
        message: existing_parent_id ? 'Parent login created successfully' : 'Parent registered successfully',
        data: {
          parent_id: parentId,
          user_id: authUserId,
          email: email,
          password: createdNewAuthUser ? finalPassword : null,
          first_name: first_name,
          last_name: last_name,
          email_sent: emailSent,
          email_message_id: emailMessageId,
          email_error: emailError,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- HELPER FUNCTIONS ---

function generateSecurePassword(): string {
  const length = 12;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
}

async function generateParentId(supabaseAdmin: any, branchId: string): Promise<string> {
  try {
    const { data: existingParents, error } = await supabaseAdmin
      .from('parents')
      .select('parent_id')
      .eq('branch_id', branchId)
      .order('parent_id', { ascending: false })
      .limit(1);

    if (error) throw error;

    let nextNumber = 1;
    if (existingParents && existingParents.length > 0) {
      const lastId = existingParents[0].parent_id;
      const match = lastId.match(/PAR-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `PAR-${String(nextNumber).padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating parent ID:', error);
    const timestamp = Date.now().toString().slice(-6);
    return `PAR-${timestamp}`;
  }
}

async function generateUserId(supabaseAdmin: any, branchId: string): Promise<string> {
  try {
    const year = new Date().getFullYear();
    const { count, error } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', branchId);

    if (error) throw error;
    const sequence = (count || 0) + 1;
    return `USR/${year}/${String(sequence).padStart(6, '0')}`;
  } catch (error) {
    console.error('Error generating user ID:', error);
    const year = new Date().getFullYear();
    return `USR/${year}/${String(Math.floor(Math.random() * 100000)).padStart(6, '0')}`;
  }
}
