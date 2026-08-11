
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

const BranchesList: React.FC = () => {
  /**
   * ------------------------------------------------------------
   * AUTH
   * ------------------------------------------------------------
   */
  const auth = useAuth();

  const user = auth?.user;

  /**
   * Some versions of the auth hook expose `loading`,
   * while others may expose `authLoading`.
   *
   * We safely check both.
   */
  const authLoading =
    Boolean(
      (auth as any)?.loading ??
        (auth as any)?.authLoading
    );

  /**
   * ------------------------------------------------------------
   * STATE
   * ------------------------------------------------------------
   */

  const [branch, setBranch] =
    useState<Branch | null>(null);

  const [paystackGateway, setPaystackGateway] =
    useState<PaymentGateway | null>(null);

  /**
   * Four possible bank account rows.
   *
   * Index 0 = Account 1
   * Index 1 = Account 2
   * Index 2 = Account 3
   * Index 3 = Account 4
   */
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

  /**
   * Paystack secret visibility.
   *
   * It remains false until the user's password
   * has been verified.
   */
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

  /**
   * ------------------------------------------------------------
   * GET USER BRANCH
   * ------------------------------------------------------------
   *
   * Your users table stores the UUID of branches
   * in users.branch_id.
   *
   * Therefore:
   *
   * users.branch_id = branches.id
   */
  const getUserBranch =
    useCallback(
      async (): Promise<Branch | null> => {
        if (!user?.branch_id) {
          return null;
        }

        const { data, error } =
          await supabase
            .from('branches')
            .select(
              `
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
              `
            )
            .eq(
              'id',
              user.branch_id
            )
            .limit(1)
            .maybeSingle();

        if (error) {
          console.error(
            'Error loading branch:',
            error
          );

          throw error;
        }

        return data as Branch | null;
      },
      [user?.branch_id]
    );

  /**
   * ------------------------------------------------------------
   * LOAD PAYMENT GATEWAYS
   * ------------------------------------------------------------
   *
   * IMPORTANT:
   *
   * We deliberately DO NOT use maybeSingle().
   *
   * A branch can have:
   *
   * Paystack
   * Account 1
   * Account 2
   * Account 3
   * Account 4
   *
   * Therefore payment_gateways returns an ARRAY.
   */
  const loadPaymentGateways =
    useCallback(
      async (
        branchId: string
      ) => {
        const { data, error } =
          await supabase
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
            'Error fetching branch payment gateways:',
            error
          );

          throw error;
        }

        const gateways =
          (data || []) as PaymentGateway[];

        /**
         * ------------------------------------------------------
         * PAYSTACK
         * ------------------------------------------------------
         */
        const paystack =
          gateways.find(
            (gateway) =>
              gateway.gateway_name
                ?.toLowerCase() ===
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

        /**
         * ------------------------------------------------------
         * BANK ACCOUNTS
         * ------------------------------------------------------
         *
         * Account number is determined from:
         *
         * metadata.account_number
         *
         * We also support:
         *
         * bank_transfer_1
         * bank_transfer_2
         * bank_transfer_3
         * bank_transfer_4
         *
         * and:
         *
         * bank_account_1
         * bank_account_2
         * bank_account_3
         * bank_account_4
         */
        const accounts:
          (PaymentGateway | null)[] = [
            null,
            null,
            null,
            null,
          ];

        gateways.forEach(
          (gateway) => {
            const gatewayName =
              gateway.gateway_name
                ?.toLowerCase()
                .trim() || '';

            const metadata =
              gateway.metadata || {};

            let index = -1;

            /**
             * First use metadata.
             */
            const metadataAccountNumber =
              Number(
                metadata.account_number
              );

            if (
              metadataAccountNumber >= 1 &&
              metadataAccountNumber <= 4
            ) {
              index =
                metadataAccountNumber -
                1;
            }

            /**
             * Fallback to gateway name.
             */
            if (index === -1) {
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
              accounts[index] =
                gateway;
            }
          }
        );

        setBankAccounts(
          accounts
        );

        /**
         * ------------------------------------------------------
         * POPULATE FORMS
         * ------------------------------------------------------
         */
        setBankForms(
          accounts.map(
            (account) => {
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
      },
      []
    );

  /**
   * ------------------------------------------------------------
   * LOAD EVERYTHING
   * ------------------------------------------------------------
   */
  const loadBranchData =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError('');
          setSuccess('');

          /**
           * Do not attempt branch loading until
           * authentication has finished.
           */
          if (authLoading) {
            return;
          }

          if (!user) {
            throw new Error(
              'You must be signed in to access branch settings.'
            );
          }

          if (!user.branch_id) {
            throw new Error(
              'Your account is not currently linked to a valid branch.'
            );
          }

          const branchData =
            await getUserBranch();

          if (!branchData) {
            throw new Error(
              'Your account is not currently linked to a valid branch.'
            );
          }

          setBranch(
            branchData
          );

          await loadPaymentGateways(
            branchData.id
          );
        } catch (err: any) {
          console.error(
            'Error loading branch:',
            err
          );

          setBranch(null);

          setError(
            err?.message ||
              'Branch information could not be loaded.'
          );
        } finally {
          setLoading(false);
        }
      },
      [
        authLoading,
        user,
        getUserBranch,
        loadPaymentGateways,
      ]
    );

  /**
   * ------------------------------------------------------------
   * INITIAL LOAD
   * ------------------------------------------------------------
   */
  useEffect(() => {
    /**
     * Authentication is still being resolved.
     *
     * Keep the page in loading mode.
     */
    if (authLoading) {
      setLoading(true);
      return;
    }

    /**
     * Auth finished.
     *
     * Now load branch.
     */
    loadBranchData();
  }, [
    authLoading,
    loadBranchData,
  ]);

  /**
   * ------------------------------------------------------------
   * UPDATE PAYSTACK FIELD
   * ------------------------------------------------------------
   */
  const updatePaystackField =
    (
      field: keyof typeof paystackForm,
      value: string | boolean
    ) => {
      setPaystackForm(
        (previous) => ({
          ...previous,
          [field]: value,
        })
      );
    };

  /**
   * ------------------------------------------------------------
   * UPDATE BANK FIELD
   * ------------------------------------------------------------
   */
  const updateBankField =
    (
      index: number,
      field: keyof BankAccountForm,
      value: string | boolean
    ) => {
      setBankForms(
        (previous) => {
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

  /**
   * ------------------------------------------------------------
   * VERIFY PASSWORD BEFORE REVEALING SECRET KEY
   * ------------------------------------------------------------
   *
   * Supabase Auth password verification is performed by
   * signing in again with the currently authenticated
   * user's email and the password supplied in the dialog.
   *
   * This does NOT expose the password to the database.
   */
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

        /**
         * Password is valid.
         */
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
      } catch (err: any) {
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

  /**
   * ------------------------------------------------------------
   * TOGGLE PAYSTACK SECRET
   * ------------------------------------------------------------
   */
  const togglePaystackSecret =
    () => {
      /**
       * If already visible, hide it immediately.
       */
      if (
        showPaystackSecret
      ) {
        setShowPaystackSecret(
          false
        );
        return;
      }

      /**
       * Already verified during this session.
       */
      if (
        passwordVerified
      ) {
        setShowPaystackSecret(
          true
        );
        return;
      }

      /**
       * Ask for password.
       */
      setPasswordError('');
      setPasswordInput('');
      setPasswordDialogOpen(
        true
      );
    };

  /**
   * ------------------------------------------------------------
   * SAVE PAYSTACK
   * ------------------------------------------------------------
   */
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

        bank_name: null,
        bank_account_number:
          null,
        bank_account_name:
          null,
        bank_sort_code:
          null,

        bank_currency:
          'NGN',

        payment_instructions:
          null,

        support_email:
          branch.email ||
          null,

        support_phone:
          branch.phone_number ||
          null,

        created_by:
          user?.id || null,

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

  /**
   * ------------------------------------------------------------
   * SAVE BANK ACCOUNT
   * ------------------------------------------------------------
   */
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

      /**
       * Empty account slot:
       * nothing to save.
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

      /**
       * Preserve existing metadata.
       */
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

          /**
           * This identifies the intended use
           * of the two main accounts.
           */
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

      /**
       * UPDATE EXISTING ROW
       */
      if (
        existingAccount?.id
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
              existingAccount.id
            )
            .eq(
              'branch_id',
              branch.id
            )
            .select('*')
            .limit(1)
            .maybeSingle();

        if (error) {
          console.error(
            `Bank Account ${
              accountNumber
            } update error:`,
            error
          );

          throw error;
        }

        if (data) {
          setBankAccounts(
            (previous) => {
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

      /**
       * INSERT NEW ROW
       */
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
        console.error(
          `Bank Account ${
            accountNumber
          } insert error:`,
          error
        );

        throw error;
      }

      if (data) {
        setBankAccounts(
          (previous) => {
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

  /**
   * ------------------------------------------------------------
   * DELETE BANK ACCOUNT
   * ------------------------------------------------------------
   */
  const deleteBankAccount =
    async (
      index: number
    ) => {
      if (!branch) {
        return;
      }

      const existing =
        bankAccounts[index];

      if (!existing?.id) {
        setBankForms(
          (previous) => {
            const copy = [
              ...previous,
            ];

            copy[index] = {
              ...emptyBankAccount,
            };

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
          (previous) => {
            const copy = [
              ...previous,
            ];

            copy[index] =
              null;

            return copy;
          }
        );

        setBankForms(
          (previous) => {
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

  /**
   * ------------------------------------------------------------
   * SAVE EVERYTHING
   * ------------------------------------------------------------
   */
  const handleSave =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      if (!branch) {
        setError(
          'No valid branch was found.'
        );

        return;
      }

      try {
        setSaving(true);
        setError('');
        setSuccess('');

        /**
         * Save Paystack.
         */
        await savePaystack();

        /**
         * Save Accounts 1-4.
         */
        for (
          let index = 0;
          index < 4;
          index++
        ) {
          await saveBankAccount(
            index
          );
        }

        /**
         * Reload from database.
         */
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

  /**
   * ------------------------------------------------------------
   * TOGGLE BANK ACCOUNT NUMBER
   * ------------------------------------------------------------
   */
  const toggleBankNumber =
    (
      index: number
    ) => {
      setShowBankNumbers(
        (previous) => {
          const copy = [
            ...previous,
          ];

          copy[index] =
            !copy[index];

          return copy;
        }
      );
    };

  /**
   * ------------------------------------------------------------
   * LOADING
   * ------------------------------------------------------------
   *
   * This must come BEFORE the branch error.
   *
   * While auth or branch data is resolving,
   * the user sees "Please wait..."
   */
  if (
    authLoading ||
    loading
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

  /**
   * ------------------------------------------------------------
   * ERROR
   * ------------------------------------------------------------
   */
  if (!branch) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900/50 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>

          <h1 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            Unable to load branch
          </h1>

          <p className="mx-auto mb-6 max-w-xl text-sm leading-6 text-gray-600 dark:text-gray-300">
            {error ||
              'Your account is not currently linked to a valid branch.'}
          </p>

          <button
            type="button"
            onClick={
              loadBranchData
            }
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /**
   * ------------------------------------------------------------
   * MAIN UI
   * ------------------------------------------------------------
   */
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
            onClick={
              loadBranchData
            }
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
          {/* PAYSTACK */}
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
                  onChange={(e) =>
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
                onChange={(value) =>
                  updatePaystackField(
                    'paystack_public_key',
                    value
                  )
                }
                placeholder="pk_live_..."
              />

              {/* SECRET KEY */}
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
                onChange={(value) =>
                  updatePaystackField(
                    'paystack_merchant_email',
                    value
                  )
                }
                placeholder="finance@ebenezer.edu.ng"
              />

              <InputField
                label="Paystack Callback URL"
                value={
                  paystackForm.paystack_callback_url
                }
                onChange={(value) =>
                  updatePaystackField(
                    'paystack_callback_url',
                    value
                  )
                }
                placeholder="https://ebenezer.edu.ng/payment/verify"
              />
            </div>
          </div>

          {/* BANK ACCOUNTS */}
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
                    bankAccounts[
                      index
                    ];

                  const accountMetadata =
                    existing?.metadata ||
                    {};

                  const paymentCategory =
                    accountMetadata.payment_category;

                  return (
                    <div
                      key={
                        existing?.id ||
                        index
                      }
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50 sm:p-5"
                    >
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            {index + 1}
                          </div>

                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">
                              Bank Account{' '}
                              {index +
                                1}
                            </h3>

                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {paymentCategory ===
                              'logistics'
                                ? 'Logistics payments'
                                : paymentCategory ===
                                  'other_fees'
                                ? 'Other school fees'
                                : existing
                                ? 'Saved account'
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
                              onChange={(
                                e
                              ) =>
                                updateBankField(
                                  index,
                                  'is_active',
                                  e.target
                                    .checked
                                )
                              }
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />

                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                              Active
                            </span>
                          </label>

                          {existing && (
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

                      <div className="grid gap-5 md:grid-cols-2">
                        <InputField
                          label="Bank Name"
                          value={
                            form.bank_name
                          }
                          onChange={(
                            value
                          ) =>
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
                              onChange={(
                                e
                              ) =>
                                updateBankField(
                                  index,
                                  'bank_account_number',
                                  e.target
                                    .value
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
                          onChange={(
                            value
                          ) =>
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
                          onChange={(
                            value
                          ) =>
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
                          onChange={(
                            value
                          ) =>
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
                          onChange={(
                            value
                          ) =>
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
                          onChange={(
                            value
                          ) =>
                            updateBankField(
                              index,
                              'support_email',
                              value
                            )
                          }
                          placeholder="finance@ebenezer.edu.ng"
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
                            onChange={(
                              e
                            ) =>
                              updateBankField(
                                index,
                                'payment_instructions',
                                e.target
                                  .value
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
                                  {index +
                                    1}
                                </strong>{' '}
                                in{' '}
                                <strong>
                                  payment_gateways
                                </strong>
                                , with Account{' '}
                                <strong>
                                  {index +
                                    1}
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

      {/* PASSWORD VERIFICATION MODAL */}
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
                onChange={(
                  e
                ) => {
                  setPasswordInput(
                    e.target.value
                  );
                  setPasswordError(
                    ''
                  );
                }}
                onKeyDown={(
                  e
                ) => {
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

/**
 * ------------------------------------------------------------
 * INFO ITEM
 * ------------------------------------------------------------
 */
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

/**
 * ------------------------------------------------------------
 * INPUT FIELD
 * ------------------------------------------------------------
 */
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
        onChange={(e) =>
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