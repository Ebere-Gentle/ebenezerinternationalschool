import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Building2,
  CreditCard,
  Landmark,
  Mail,
  MapPin,
  Phone,
  Save,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  Hash,
  Lock,
} from 'lucide-react';

import { supabase } from '../../config/supabase/client';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../../components/common/LoadingSpinner';

/* ============================================================
   TYPES
============================================================ */

interface Branch {
  id: string;
  branch_id: string;
  branch_code: string;
  school_name: string;
  logo_url: string | null;
  email: string;
  website: string | null;
  phone_number: string | null;
  address: string;
  principal_id: string | null;
  director_id: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  metadata: Record<string, any> | null;
}

interface BankMetadataAccount {
  currency?: string | null;
  bank_name?: string | null;
  sort_code?: string | null;
  account_name?: string | null;
  account_label?: string | null;
  account_number?: string | null;
}

interface PaymentGateway {
  id: string;
  branch_id: string;
  gateway_name: string;
  is_active: boolean;

  paystack_public_key: string | null;
  paystack_secret_key: string | null;
  paystack_merchant_email: string | null;
  paystack_callback_url: string | null;

  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  bank_sort_code: string | null;
  bank_currency: string | null;

  payment_instructions: string | null;
  support_email: string | null;
  support_phone: string | null;

  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;

  metadata: Record<string, any> | null;
}

interface BankAccountForm {
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  bank_sort_code: string;
  bank_currency: string;
  payment_instructions: string;
  support_email: string;
  support_phone: string;
  is_active: boolean;
}

/* ============================================================
   DEFAULT BANK FORM
============================================================ */

const emptyBankAccount: BankAccountForm = {
  bank_name: '',
  bank_account_number: '',
  bank_account_name: '',
  bank_sort_code: '',
  bank_currency: 'NGN',
  payment_instructions: '',
  support_email: '',
  support_phone: '',
  is_active: true,
};

/* ============================================================
   COMPONENT
============================================================ */

const BranchesList: React.FC = () => {
  const auth = useAuth();

  const user = auth?.user;

  const authLoading = Boolean(
    (auth as any)?.loading ??
      (auth as any)?.authLoading
  );

  /* ==========================================================
     STATE
  ========================================================== */

  const [branch, setBranch] =
    useState<Branch | null>(null);

  const [paystackGateway, setPaystackGateway] =
    useState<PaymentGateway | null>(null);

  const [bankAccounts, setBankAccounts] =
    useState<(PaymentGateway | null)[]>([
      null,
      null,
      null,
      null,
    ]);

  const [bankForms, setBankForms] =
    useState<BankAccountForm[]>(
      Array.from(
        { length: 4 },
        () => ({
          ...emptyBankAccount,
        })
      )
    );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const [
    showPaystackSecret,
    setShowPaystackSecret,
  ] = useState(false);

  const [
    verifyingPassword,
    setVerifyingPassword,
  ] = useState(false);

  const [
    passwordVerified,
    setPasswordVerified,
  ] = useState(false);

  const [
    passwordDialogOpen,
    setPasswordDialogOpen,
  ] = useState(false);

  const [
    passwordInput,
    setPasswordInput,
  ] = useState('');

  const [
    passwordError,
    setPasswordError,
  ] = useState('');

  const [
    showBankNumbers,
    setShowBankNumbers,
  ] = useState<boolean[]>([
    false,
    false,
    false,
    false,
  ]);

  const [
    paystackForm,
    setPaystackForm,
  ] = useState({
    is_active: true,
    paystack_public_key: '',
    paystack_secret_key: '',
    paystack_merchant_email: '',
    paystack_callback_url: '',
  });

  /* ==========================================================
     GET USER BRANCH

     IMPORTANT:
     This function only returns the branch.
     It does NOT display an error to the user.
  ========================================================== */

  const getUserBranch =
    useCallback(
      async (): Promise<Branch | null> => {
        if (!user?.branch_id) {
          return null;
        }

        const {
          data,
          error,
        } = await supabase
          .from('branches')
          .select(`
            id,
            branch_id,
            branch_code,
            school_name,
            logo_url,
            email,
            website,
            phone_number,
            address,
            principal_id,
            director_id,
            status,
            created_at,
            updated_at,
            created_by,
            metadata
          `)
          .eq(
            'id',
            user.branch_id
          )
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error(
            'Branch loading attempt:',
            error
          );

          return null;
        }

        return data as Branch | null;
      },
      [user?.branch_id]
    );

  /* ==========================================================
     CREATE BANK GATEWAY FROM METADATA

     Your current database has bank information inside:

     payment_gateways
       gateway_name = paystack

     metadata.bank_accounts = [...]

     This function converts that metadata account into
     the same structure used by the UI.
  ========================================================== */

  const createMetadataGateway = (
    account: BankMetadataAccount,
    index: number,
    paystack: PaymentGateway
  ): PaymentGateway => {
    return {
      id: `metadata-${paystack.id}-${index + 1}`,

      branch_id:
        paystack.branch_id,

      gateway_name:
        `bank_transfer_${index + 1}`,

      is_active:
        paystack.is_active ?? true,

      paystack_public_key:
        null,

      paystack_secret_key:
        null,

      paystack_merchant_email:
        null,

      paystack_callback_url:
        null,

      bank_name:
        account.bank_name || null,

      bank_account_number:
        account.account_number || null,

      bank_account_name:
        account.account_name || null,

      bank_sort_code:
        account.sort_code || null,

      bank_currency:
        account.currency || 'NGN',

      payment_instructions:
        paystack.payment_instructions || null,

      support_email:
        paystack.support_email || null,

      support_phone:
        paystack.support_phone || null,

      created_at:
        paystack.created_at,

      updated_at:
        paystack.updated_at,

      created_by:
        paystack.created_by,

      metadata: {
        account_number:
          index + 1,

        account_label:
          account.account_label ||
          `Account ${index + 1}`,

        payment_type:
          'bank_transfer',

        payment_category:
          index === 0
            ? 'other_fees'
            : index === 1
            ? 'logistics'
            : 'other',

        source:
          'paystack_metadata',

        parent_paystack_gateway_id:
          paystack.id,
      },
    };
  };

  /* ==========================================================
     LOAD PAYMENT GATEWAYS
  ========================================================== */

  const loadPaymentGateways =
    useCallback(
      async (
        branchId: string
      ) => {
        const {
          data,
          error,
        } = await supabase
          .from('payment_gateways')
          .select('*')
          .eq(
            'branch_id',
            branchId
          )
          .order(
            'created_at',
            {
              ascending: true,
            }
          );

        if (error) {
          console.error(
            'Payment gateways loading attempt:',
            error
          );

          return false;
        }

        const gateways =
          (data || []) as PaymentGateway[];

        /* ======================================================
           PAYSTACK
        ====================================================== */

        const paystack =
          gateways.find(
            gateway =>
              gateway.gateway_name
                ?.toLowerCase()
                .trim() ===
              'paystack'
          ) || null;

        setPaystackGateway(
          paystack
        );

        if (paystack) {
          setPaystackForm({
            is_active:
              paystack.is_active ??
              true,

            paystack_public_key:
              paystack.paystack_public_key ||
              '',

            paystack_secret_key:
              paystack.paystack_secret_key ||
              '',

            paystack_merchant_email:
              paystack.paystack_merchant_email ||
              '',

            paystack_callback_url:
              paystack.paystack_callback_url ||
              '',
          });
        }

        /* ======================================================
           BANK ACCOUNTS

           We support TWO database structures:

           1. bank_transfer_1
           2. bank_transfer_2
           3. bank_transfer_3
           4. bank_transfer_4

           AND

           paystack.metadata.bank_accounts[]
        ====================================================== */

        const accounts:
          (PaymentGateway | null)[] = [
            null,
            null,
            null,
            null,
          ];

        /* ------------------------------------------------------
           FIRST: READ BANK ACCOUNTS FROM PAYSTACK METADATA
        ------------------------------------------------------ */

        if (paystack) {
          const metadata =
            paystack.metadata || {};

          const metadataAccounts =
            Array.isArray(
              metadata.bank_accounts
            )
              ? metadata.bank_accounts
              : [];

          metadataAccounts
            .slice(0, 4)
            .forEach(
              (
                account: BankMetadataAccount,
                index: number
              ) => {
                if (
                  account &&
                  (
                    account.bank_name ||
                    account.account_number ||
                    account.account_name
                  )
                ) {
                  accounts[index] =
                    createMetadataGateway(
                      account,
                      index,
                      paystack
                    );
                }
              }
            );
        }

        /* ------------------------------------------------------
           SECOND: READ INDIVIDUAL BANK TRANSFER ROWS

           These override metadata because they are the newer,
           independently editable records.
        ------------------------------------------------------ */

        gateways.forEach(
          gateway => {
            const gatewayName =
              gateway.gateway_name
                ?.toLowerCase()
                .trim() || '';

            let index = -1;

            const metadata =
              gateway.metadata || {};

            const metadataAccountNumber =
              Number(
                metadata.account_number
              );

            if (
              metadataAccountNumber >= 1 &&
              metadataAccountNumber <= 4
            ) {
              index =
                metadataAccountNumber - 1;
            }

            if (
              index === -1
            ) {
              const match =
                gatewayName.match(
                  /(?:bank_transfer|bank_account)_(\d+)/
                );

              if (match) {
                const accountNumber =
                  Number(match[1]);

                if (
                  accountNumber >= 1 &&
                  accountNumber <= 4
                ) {
                  index =
                    accountNumber - 1;
                }
              }
            }

            if (
              index >= 0 &&
              index < 4
            ) {
              /*
               * Ignore fake/empty bank rows.
               */
              const hasBankData =
                Boolean(
                  gateway.bank_name ||
                  gateway.bank_account_number ||
                  gateway.bank_account_name
                );

              if (hasBankData) {
                accounts[index] =
                  gateway;
              }
            }
          }
        );

        /* ------------------------------------------------------
           SAVE ACCOUNTS
        ------------------------------------------------------ */

        setBankAccounts(
          accounts
        );

        /* ======================================================
           POPULATE FORM FIELDS
        ====================================================== */

        setBankForms(
          accounts.map(
            account => {
              if (!account) {
                return {
                  ...emptyBankAccount,
                };
              }

              return {
                bank_name:
                  account.bank_name ||
                  '',

                bank_account_number:
                  account.bank_account_number ||
                  '',

                bank_account_name:
                  account.bank_account_name ||
                  '',

                bank_sort_code:
                  account.bank_sort_code ||
                  '',

                bank_currency:
                  account.bank_currency ||
                  'NGN',

                payment_instructions:
                  account.payment_instructions ||
                  '',

                support_email:
                  account.support_email ||
                  '',

                support_phone:
                  account.support_phone ||
                  '',

                is_active:
                  account.is_active ??
                  true,
              };
            }
          )
        );

        return true;
      },
      []
    );

  /* ==========================================================
     LOAD EVERYTHING

     IMPORTANT:

     There is NO branch error screen anymore.

     If branch isn't ready, we simply keep loading.
  ========================================================== */

  const loadBranchData =
    useCallback(
      async () => {
        /*
         * Do not start until auth has finished.
         */
        if (authLoading) {
          setLoading(true);
          return false;
        }

        /*
         * No authenticated user yet.
         *
         * Keep loading.
         */
        if (!user) {
          setLoading(true);
          return false;
        }

        /*
         * User exists but branch_id isn't available yet.
         *
         * Keep loading.
         */
        if (!user.branch_id) {
          setLoading(true);
          return false;
        }

        try {
          setLoading(true);

          const branchData =
            await getUserBranch();

          /*
           * Branch isn't available yet.
           *
           * DO NOT SHOW ERROR.
           */
          if (!branchData) {
            setLoading(true);
            return false;
          }

          /*
           * Branch successfully loaded.
           */
          setBranch(
            branchData
          );

          /*
           * Load payment data.
           */
          await loadPaymentGateways(
            branchData.id
          );

          /*
           * Everything is ready.
           */
          setLoading(false);

          return true;
        } catch (err) {
          /*
           * Do not show the error to the user.
           *
           * Keep loading and let the retry mechanism
           * attempt again.
           */
          console.error(
            'Branch loading attempt:',
            err
          );

          setLoading(true);

          return false;
        }
      },
      [
        authLoading,
        user,
        getUserBranch,
        loadPaymentGateways,
      ]
    );

  /* ==========================================================
     INITIAL LOAD + SILENT RETRY
  ========================================================== */

  useEffect(() => {
    let cancelled = false;

    let retryTimer:
      ReturnType<
        typeof setTimeout
      > | null = null;

    const attemptLoad =
      async () => {
        if (cancelled) {
          return;
        }

        const loaded =
          await loadBranchData();

        if (
          !loaded &&
          !cancelled
        ) {
          /*
           * Retry quietly every 1.5 seconds.
           *
           * The user only sees:
           *
           * "Please wait..."
           */
          retryTimer =
            setTimeout(
              attemptLoad,
              1500
            );
        }
      };

    if (!authLoading) {
      attemptLoad();
    }

    return () => {
      cancelled = true;

      if (retryTimer) {
        clearTimeout(
          retryTimer
        );
      }
    };
  }, [
    authLoading,
    loadBranchData,
  ]);

  /* ==========================================================
     PAYSTACK FIELD
  ========================================================== */

  const updatePaystackField =
    (
      field: keyof typeof paystackForm,
      value: string | boolean
    ) => {
      setPaystackForm(
        previous => ({
          ...previous,
          [field]: value,
        })
      );
    };

  /* ==========================================================
     BANK FIELD
  ========================================================== */

  const updateBankField =
    (
      index: number,
      field: keyof BankAccountForm,
      value: string | boolean
    ) => {
      setBankForms(
        previous => {
          const copy = [
            ...previous,
          ];

          copy[index] = {
            ...copy[index],
            [field]: value,
          };

          return copy;
        }
      );
    };

  /* ==========================================================
     VERIFY PASSWORD
  ========================================================== */

  const verifyPassword =
    async () => {
      if (!user?.email) {
        setPasswordError(
          'Your authenticated email address could not be determined.'
        );

        return;
      }

      if (
        !passwordInput.trim()
      ) {
        setPasswordError(
          'Please enter your password.'
        );

        return;
      }

      try {
        setVerifyingPassword(
          true
        );

        setPasswordError('');

        const {
          error,
        } =
          await supabase.auth.signInWithPassword(
            {
              email:
                user.email,
              password:
                passwordInput,
            }
          );

        if (error) {
          throw error;
        }

        setPasswordVerified(
          true
        );

        setShowPaystackSecret(
          true
        );

        setPasswordDialogOpen(
          false
        );

        setPasswordInput('');
        setPasswordError('');
      } catch (err) {
        console.error(
          'Password verification failed:',
          err
        );

        setPasswordError(
          'Incorrect password. Please try again.'
        );
      } finally {
        setVerifyingPassword(
          false
        );
      }
    };

  /* ==========================================================
     TOGGLE PAYSTACK SECRET
  ========================================================== */

  const togglePaystackSecret =
    () => {
      if (
        showPaystackSecret
      ) {
        setShowPaystackSecret(
          false
        );

        return;
      }

      if (
        passwordVerified
      ) {
        setShowPaystackSecret(
          true
        );

        return;
      }

      setPasswordError('');
      setPasswordInput('');
      setPasswordDialogOpen(
        true
      );
    };

  /* ==========================================================
     SAVE PAYSTACK
  ========================================================== */

  const savePaystack =
    async () => {
      if (!branch) {
        return;
      }

      if (
        !paystackForm.paystack_public_key.trim()
      ) {
        throw new Error(
          'Paystack public key is required.'
        );
      }

      if (
        !paystackForm.paystack_secret_key.trim()
      ) {
        throw new Error(
          'Paystack secret key is required.'
        );
      }

      const payload = {
        branch_id:
          branch.id,

        gateway_name:
          'paystack',

        is_active:
          paystackForm.is_active,

        paystack_public_key:
          paystackForm.paystack_public_key.trim(),

        paystack_secret_key:
          paystackForm.paystack_secret_key.trim(),

        paystack_merchant_email:
          paystackForm.paystack_merchant_email.trim() ||
          null,

        paystack_callback_url:
          paystackForm.paystack_callback_url.trim() ||
          null,

        bank_name:
          paystackGateway?.bank_name ||
          null,

        bank_account_number:
          paystackGateway?.bank_account_number ||
          null,

        bank_account_name:
          paystackGateway?.bank_account_name ||
          null,

        bank_sort_code:
          paystackGateway?.bank_sort_code ||
          null,

        bank_currency:
          paystackGateway?.bank_currency ||
          'NGN',

        payment_instructions:
          paystackGateway?.payment_instructions ||
          null,

        support_email:
          branch.email ||
          null,

        support_phone:
          branch.phone_number ||
          null,

        created_by:
          paystackGateway?.created_by ||
          user?.id ||
          null,

        metadata: {
          ...(paystackGateway?.metadata ||
            {}),

          branch_code:
            branch.branch_code,

          payment_channels: [
            'card',
            'bank_transfer',
          ],
        },

        updated_at:
          new Date().toISOString(),
      };

      if (
        paystackGateway?.id
      ) {
        /*
         * Only update if this is a real database UUID.
         */
        if (
          !paystackGateway.id.startsWith(
            'metadata-'
          )
        ) {
          const {
            data,
            error,
          } =
            await supabase
              .from(
                'payment_gateways'
              )
              .update(
                payload
              )
              .eq(
                'id',
                paystackGateway.id
              )
              .eq(
                'branch_id',
                branch.id
              )
              .select('*')
              .limit(1)
              .maybeSingle();

          if (error) {
            throw error;
          }

          if (data) {
            setPaystackGateway(
              data as PaymentGateway
            );
          }
        }
      } else {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              'payment_gateways'
            )
            .insert({
              ...payload,

              created_at:
                new Date().toISOString(),
            })
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error) {
          throw error;
        }

        if (data) {
          setPaystackGateway(
            data as PaymentGateway
          );
        }
      }
    };

  /* ==========================================================
     SAVE BANK ACCOUNT
  ========================================================== */

  const saveBankAccount =
    async (
      index: number
    ) => {
      if (!branch) {
        return;
      }

      const form =
        bankForms[index];

      const isEmpty =
        !form.bank_name.trim() &&
        !form.bank_account_number.trim() &&
        !form.bank_account_name.trim();

      /*
       * Empty slot = nothing to save.
       */
      if (isEmpty) {
        return;
      }

      if (
        !form.bank_name.trim()
      ) {
        throw new Error(
          `Bank name is required for Account ${
            index + 1
          }.`
        );
      }

      if (
        !form.bank_account_number.trim()
      ) {
        throw new Error(
          `Account number is required for Account ${
            index + 1
          }.`
        );
      }

      if (
        !form.bank_account_name.trim()
      ) {
        throw new Error(
          `Account name is required for Account ${
            index + 1
          }.`
        );
      }

      const accountNumber =
        index + 1;

      const gatewayName =
        `bank_transfer_${accountNumber}`;

      const existingAccount =
        bankAccounts[index];

      const existingIsRealRow =
        existingAccount?.id &&
        !existingAccount.id.startsWith(
          'metadata-'
        );

      const existingMetadata =
        existingAccount?.metadata ||
        {};

      const payload = {
        branch_id:
          branch.id,

        gateway_name:
          gatewayName,

        is_active:
          form.is_active,

        paystack_public_key:
          null,

        paystack_secret_key:
          null,

        paystack_merchant_email:
          null,

        paystack_callback_url:
          null,

        bank_name:
          form.bank_name.trim(),

        bank_account_number:
          form.bank_account_number.trim(),

        bank_account_name:
          form.bank_account_name.trim(),

        bank_sort_code:
          form.bank_sort_code.trim() ||
          null,

        bank_currency:
          form.bank_currency.trim() ||
          'NGN',

        payment_instructions:
          form.payment_instructions.trim() ||
          null,

        support_email:
          form.support_email.trim() ||
          branch.email ||
          null,

        support_phone:
          form.support_phone.trim() ||
          branch.phone_number ||
          null,

        created_by:
          existingAccount?.created_by ||
          user?.id ||
          null,

        metadata: {
          ...existingMetadata,

          branch_code:
            branch.branch_code,

          account_number:
            accountNumber,

          account_label:
            `Account ${accountNumber}`,

          payment_type:
            'bank_transfer',

          payment_channels: [
            'bank_transfer',
          ],

          payment_category:
            accountNumber === 1
              ? 'other_fees'
              : accountNumber === 2
              ? 'logistics'
              : existingMetadata.payment_category ||
                'other',
        },

        updated_at:
          new Date().toISOString(),
      };

      /* ======================================================
         UPDATE EXISTING REAL ROW
      ====================================================== */

      if (
        existingIsRealRow
      ) {
        const {
          data,
          error,
        } =
          await supabase
            .from(
              'payment_gateways'
            )
            .update(
              payload
            )
            .eq(
              'id',
              existingAccount!.id
            )
            .eq(
              'branch_id',
              branch.id
            )
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error) {
          throw error;
        }

        if (data) {
          setBankAccounts(
            previous => {
              const copy = [
                ...previous,
              ];

              copy[index] =
                data as PaymentGateway;

              return copy;
            }
          );
        }

        return;
      }

      /* ======================================================
         INSERT NEW REAL ROW

         This is also used when the account originally came
         from paystack.metadata.bank_accounts.
      ====================================================== */

      const {
        data,
        error,
      } =
        await supabase
          .from(
            'payment_gateways'
          )
          .insert({
            ...payload,

            created_at:
              new Date().toISOString(),
          })
          .select('*')
          .limit(1)
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setBankAccounts(
          previous => {
            const copy = [
              ...previous,
            ];

            copy[index] =
              data as PaymentGateway;

            return copy;
          }
        );
      }
    };

  /* ==========================================================
     DELETE BANK ACCOUNT
  ========================================================== */

  const deleteBankAccount =
    async (
      index: number
    ) => {
      if (!branch) {
        return;
      }

      const existing =
        bankAccounts[index];

      /*
       * Metadata-only account isn't a database row.
       *
       * Just clear the form.
       */
      if (
        !existing?.id ||
        existing.id.startsWith(
          'metadata-'
        )
      ) {
        setBankForms(
          previous => {
            const copy = [
              ...previous,
            ];

            copy[index] = {
              ...emptyBankAccount,
            };

            return copy;
          }
        );

        setBankAccounts(
          previous => {
            const copy = [
              ...previous,
            ];

            copy[index] =
              null;

            return copy;
          }
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Remove Bank Account ${
            index + 1
          } from this branch?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setSaving(true);
        setError('');
        setSuccess('');

        const {
          error,
        } =
          await supabase
            .from(
              'payment_gateways'
            )
            .delete()
            .eq(
              'id',
              existing.id
            )
            .eq(
              'branch_id',
              branch.id
            );

        if (error) {
          throw error;
        }

        setBankAccounts(
          previous => {
            const copy = [
              ...previous,
            ];

            copy[index] =
              null;

            return copy;
          }
        );

        setBankForms(
          previous => {
            const copy = [
              ...previous,
            ];

            copy[index] = {
              ...emptyBankAccount,
            };

            return copy;
          }
        );

        setSuccess(
          `Bank Account ${
            index + 1
          } removed successfully.`
        );
      } catch (err: any) {
        console.error(
          'Delete bank account error:',
          err
        );

        setError(
          err?.message ||
            'Could not remove bank account.'
        );
      } finally {
        setSaving(false);
      }
    };

  /* ==========================================================
     SAVE EVERYTHING
  ========================================================== */

  const handleSave =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      if (!branch) {
        return;
      }

      try {
        setSaving(true);
        setError('');
        setSuccess('');

        await savePaystack();

        for (
          let index = 0;
          index < 4;
          index++
        ) {
          await saveBankAccount(
            index
          );
        }

        await loadPaymentGateways(
          branch.id
        );

        setSuccess(
          'Branch payment settings saved successfully.'
        );
      } catch (err: any) {
        console.error(
          'Save branch settings error:',
          err
        );

        setError(
          err?.message ||
            'Unable to save branch settings.'
        );
      } finally {
        setSaving(false);
      }
    };

  /* ==========================================================
     TOGGLE BANK NUMBER
  ========================================================== */

  const toggleBankNumber =
    (
      index: number
    ) => {
      setShowBankNumbers(
        previous => {
          const copy = [
            ...previous,
          ];

          copy[index] =
            !copy[index];

          return copy;
        }
      );
    };

  /* ==========================================================
     LOADING SCREEN

     THERE IS NO BRANCH ERROR SCREEN ANYMORE.
  ========================================================== */

  if (
    authLoading ||
    loading ||
    !branch
  ) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="flex flex-col items-center justify-center text-center">
          <LoadingSpinner />

          <p className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">
            Please wait...
          </p>

          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Loading branch information
          </p>
        </div>
      </div>
    );
  }

  /* ==========================================================
     MAIN UI
  ========================================================== */

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 dark:bg-gray-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* HEADER */}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                {branch.branch_code ||
                  branch.branch_id}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              Branch Settings
            </h1>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage payment settings and bank accounts for your branch.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              loadBranchData();
            }}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* SUCCESS */}

        {success && (
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-900/50 dark:bg-green-950/20 dark:text-green-300">
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />

            <div className="text-sm font-medium">
              {success}
            </div>
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />

            <div className="text-sm font-medium">
              {error}
            </div>
          </div>
        )}

        {/* BRANCH INFORMATION */}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-2.5 dark:bg-blue-900/30">
              <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>

            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">
                Branch Information
              </h2>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Your account can only manage this branch.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

            <InfoItem
              icon={
                <Building2 className="h-4 w-4" />
              }
              label="School"
              value={
                branch.school_name
              }
            />

            <InfoItem
              icon={
                <Hash className="h-4 w-4" />
              }
              label="Branch Code"
              value={
                branch.branch_code
              }
            />

            <InfoItem
              icon={
                <Mail className="h-4 w-4" />
              }
              label="Email"
              value={
                branch.email
              }
            />

            <InfoItem
              icon={
                <Phone className="h-4 w-4" />
              }
              label="Phone"
              value={
                branch.phone_number ||
                'Not provided'
              }
            />

            <InfoItem
              icon={
                <Globe className="h-4 w-4" />
              }
              label="Website"
              value={
                branch.website ||
                'Not provided'
              }
            />

            <InfoItem
              icon={
                <MapPin className="h-4 w-4" />
              }
              label="Address"
              value={
                branch.address
              }
            />

          </div>
        </div>

        <form
          onSubmit={
            handleSave
          }
        >

          {/* ==================================================
              PAYSTACK
          ================================================== */}

          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-indigo-100 p-2.5 dark:bg-indigo-900/30">
                  <CreditCard className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>

                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">
                    Paystack
                  </h2>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Online card and payment gateway configuration.
                  </p>
                </div>

              </div>

              <label className="flex cursor-pointer items-center gap-2">

                <input
                  type="checkbox"
                  checked={
                    paystackForm.is_active
                  }
                  onChange={e =>
                    updatePaystackField(
                      'is_active',
                      e.target.checked
                    )
                  }
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />

                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Active
                </span>

              </label>

            </div>

            <div className="grid gap-5 md:grid-cols-2">

              <InputField
                label="Paystack Public Key"
                value={
                  paystackForm.paystack_public_key
                }
                onChange={value =>
                  updatePaystackField(
                    'paystack_public_key',
                    value
                  )
                }
                placeholder="pk_live_..."
              />

              {/* SECRET */}

              <div>

                <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Paystack Secret Key
                </label>

                <div className="relative">

                  <input
                    type={
                      showPaystackSecret
                        ? 'text'
                        : 'password'
                    }
                    value={
                      paystackForm.paystack_secret_key
                    }
                    readOnly
                    placeholder="sk_live_..."
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-24 text-sm text-gray-900 outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />

                  <button
                    type="button"
                    onClick={
                      togglePaystackSecret
                    }
                    className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                  >
                    {showPaystackSecret ? (
                      <>
                        <EyeOff className="h-5 w-5" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="h-5 w-5" />
                        View
                      </>
                    )}
                  </button>

                </div>

                <p className="mt-1 text-xs text-gray-400">
                  Password verification is required before viewing this secret key.
                </p>

              </div>

              <InputField
                label="Paystack Merchant Email"
                type="email"
                value={
                  paystackForm.paystack_merchant_email
                }
                onChange={value =>
                  updatePaystackField(
                    'paystack_merchant_email',
                    value
                  )
                }
                placeholder="finance@ebeniza.edu.ng"
              />

              <InputField
                label="Paystack Callback URL"
                value={
                  paystackForm.paystack_callback_url
                }
                onChange={value =>
                  updatePaystackField(
                    'paystack_callback_url',
                    value
                  )
                }
                placeholder="https://ebeniza.edu.ng/payment/verify"
              />

            </div>
          </div>

          {/* ==================================================
              BANK ACCOUNTS
          ================================================== */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-green-100 p-2.5 dark:bg-green-900/30">
                  <Landmark className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>

                <div>
                  <h2 className="font-bold text-gray-900 dark:text-white">
                    Bank Accounts
                  </h2>

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Add up to 4 bank accounts for this branch.
                  </p>
                </div>

              </div>

              <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                Up to 4 accounts
              </span>

            </div>

            <div className="space-y-6">

              {bankForms.map(
                (
                  form,
                  index
                ) => {

                  const existing =
                    bankAccounts[index];

                  const accountMetadata =
                    existing?.metadata ||
                    {};

                  const paymentCategory =
                    accountMetadata.payment_category;

                  const isMetadataAccount =
                    Boolean(
                      existing?.id?.startsWith(
                        'metadata-'
                      )
                    );

                  return (
                    <div
                      key={
                        existing?.id ||
                        index
                      }
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50 sm:p-5"
                    >

                      {/* ACCOUNT HEADER */}

                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                        <div className="flex items-center gap-3">

                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {index + 1}
                          </div>

                          <div>

                            <h3 className="font-bold text-gray-900 dark:text-white">
                              Bank Account{' '}
                              {index + 1}
                            </h3>

                            <p className="text-xs text-gray-500 dark:text-gray-400">

                              {paymentCategory ===
                              'logistics'
                                ? 'Logistics payments'
                                : paymentCategory ===
                                  'other_fees'
                                ? 'Other school fees'
                                : existing
                                ? isMetadataAccount
                                  ? 'Loaded from branch payment settings'
                                  : 'Saved account'
                                : 'New account'}

                            </p>

                          </div>

                        </div>

                        <div className="flex items-center gap-3">

                          <label className="flex cursor-pointer items-center gap-2">

                            <input
                              type="checkbox"
                              checked={
                                form.is_active
                              }
                              onChange={e =>
                                updateBankField(
                                  index,
                                  'is_active',
                                  e.target.checked
                                )
                              }
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />

                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              Active
                            </span>

                          </label>

                          {existing &&
                            !isMetadataAccount && (
                              <button
                                type="button"
                                onClick={() =>
                                  deleteBankAccount(
                                    index
                                  )
                                }
                                disabled={
                                  saving
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove
                              </button>
                            )}

                        </div>

                      </div>

                      {/* ACCOUNT FIELDS */}

                      <div className="grid gap-5 md:grid-cols-2">

                        <InputField
                          label="Bank Name"
                          value={
                            form.bank_name
                          }
                          onChange={value =>
                            updateBankField(
                              index,
                              'bank_name',
                              value
                            )
                          }
                          placeholder="Zenith Bank"
                        />

                        {/* ACCOUNT NUMBER */}

                        <div>

                          <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Account Number
                          </label>

                          <div className="relative">

                            <input
                              type={
                                showBankNumbers[
                                  index
                                ]
                                  ? 'text'
                                  : 'password'
                              }
                              value={
                                form.bank_account_number
                              }
                              onChange={e =>
                                updateBankField(
                                  index,
                                  'bank_account_number',
                                  e.target.value
                                )
                              }
                              placeholder="1012345678"
                              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-12 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                toggleBankNumber(
                                  index
                                )
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                            >
                              {showBankNumbers[
                                index
                              ] ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>

                          </div>

                        </div>

                        <InputField
                          label="Account Name"
                          value={
                            form.bank_account_name
                          }
                          onChange={value =>
                            updateBankField(
                              index,
                              'bank_account_name',
                              value
                            )
                          }
                          placeholder="Ebenezer International School"
                        />

                        <InputField
                          label="Bank Sort Code"
                          value={
                            form.bank_sort_code
                          }
                          onChange={value =>
                            updateBankField(
                              index,
                              'bank_sort_code',
                              value
                            )
                          }
                          placeholder="057"
                        />

                        <InputField
                          label="Currency"
                          value={
                            form.bank_currency
                          }
                          onChange={value =>
                            updateBankField(
                              index,
                              'bank_currency',
                              value
                            )
                          }
                          placeholder="NGN"
                        />

                        <InputField
                          label="Support Phone"
                          value={
                            form.support_phone
                          }
                          onChange={value =>
                            updateBankField(
                              index,
                              'support_phone',
                              value
                            )
                          }
                          placeholder="+234..."
                        />

                        <InputField
                          label="Support Email"
                          type="email"
                          value={
                            form.support_email
                          }
                          onChange={value =>
                            updateBankField(
                              index,
                              'support_email',
                              value
                            )
                          }
                          placeholder="finance@ebeniza.edu.ng"
                        />

                        <div className="md:col-span-2">

                          <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Payment Instructions
                          </label>

                          <textarea
                            rows={4}
                            value={
                              form.payment_instructions
                            }
                            onChange={e =>
                              updateBankField(
                                index,
                                'payment_instructions',
                                e.target.value
                              )
                            }
                            placeholder={`Please use your child's admission number as reference when making bank transfers.

Amount: The exact amount due
Reference: Child's Admission Number`}
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                          />

                          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-900/30 dark:bg-blue-950/20">

                            <div className="flex items-start gap-2">

                              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />

                              <p className="text-xs text-blue-700 dark:text-blue-300">

                                This account is stored as{' '}

                                <strong>
                                  bank_transfer_
                                  {index + 1}
                                </strong>{' '}

                                in{' '}

                                <strong>
                                  payment_gateways
                                </strong>{' '}

                                with Account{' '}

                                <strong>
                                  {index + 1}
                                </strong>{' '}

                                identified in metadata.

                              </p>

                            </div>

                          </div>

                        </div>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          </div>

          {/* SAVE */}

          <div className="sticky bottom-4 z-10 mt-6 flex justify-end">

            <button
              type="submit"
              disabled={
                saving
              }
              className="inline-flex min-w-[180px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Settings
                </>
              )}

            </button>

          </div>

        </form>
      </div>

      {/* ======================================================
          PASSWORD VERIFICATION MODAL
      ====================================================== */}

      {passwordDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">

            <div className="mb-5 flex items-start gap-3">

              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <Lock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>

              <div>

                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Verify your password
                </h2>

                <p className="mt-1 text-sm leading-5 text-gray-500 dark:text-gray-400">
                  Enter your current account password to view the Paystack secret key.
                </p>

              </div>

            </div>

            <div>

              <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
                Password
              </label>

              <input
                type="password"
                autoFocus
                value={
                  passwordInput
                }
                onChange={e => {
                  setPasswordInput(
                    e.target.value
                  );

                  setPasswordError('');
                }}
                onKeyDown={e => {
                  if (
                    e.key ===
                    'Enter'
                  ) {
                    e.preventDefault();

                    if (
                      !verifyingPassword
                    ) {
                      verifyPassword();
                    }
                  }
                }}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
              />

              {passwordError && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">

                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />

                  <span>
                    {
                      passwordError
                    }
                  </span>

                </div>
              )}

            </div>

            <div className="mt-6 flex justify-end gap-3">

              <button
                type="button"
                onClick={() => {
                  setPasswordDialogOpen(
                    false
                  );

                  setPasswordInput(
                    ''
                  );

                  setPasswordError(
                    ''
                  );
                }}
                disabled={
                  verifyingPassword
                }
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  verifyPassword
                }
                disabled={
                  verifyingPassword ||
                  !passwordInput.trim()
                }
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {verifyingPassword ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Verify & View
                  </>
                )}

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

/* ============================================================
   INFO ITEM
============================================================ */

const InfoItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({
  icon,
  label,
  value,
}) => {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">

      <div className="mb-2 flex items-center gap-2 text-blue-600 dark:text-blue-400">

        {icon}

        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </span>

      </div>

      <p className="break-words text-sm font-semibold text-gray-900 dark:text-white">
        {value ||
          'Not provided'}
      </p>

    </div>
  );
};

/* ============================================================
   INPUT FIELD
============================================================ */

const InputField: React.FC<{
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
  type?: string;
}> = ({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}) => {
  return (
    <div>

      <label className="mb-2 block text-sm font-semibold text-gray-700 dark:text-gray-200">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={e =>
          onChange(
            e.target.value
          )
        }
        placeholder={
          placeholder
        }
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
      />

    </div>
  );
};

export default BranchesList;