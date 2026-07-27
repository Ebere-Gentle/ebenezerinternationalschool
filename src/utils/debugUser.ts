import { supabase } from '../config/supabase/client';

export const debugUserBranch = async () => {
  try {
    console.log('=== DEBUGGING USER BRANCH ===');
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Auth error:', authError);
      return;
    }
    console.log('Authenticated user:', user?.email);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user?.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return;
    }
    console.log('User profile:', profile);

    // Check branch_id
    console.log('branch_id:', profile?.branch_id);
    console.log('school_id:', profile?.school_id);
    console.log('metadata:', profile?.metadata);

    // If branch_id is null, check all users to see if any have branch_id
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, email, branch_id, metadata')
      .limit(5);

    if (allUsersError) {
      console.error('Error fetching users:', allUsersError);
    } else {
      console.log('Sample users:', allUsers);
    }

    console.log('=== END DEBUG ===');
  } catch (error) {
    console.error('Debug error:', error);
  }
};
