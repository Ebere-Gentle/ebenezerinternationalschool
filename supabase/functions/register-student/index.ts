import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

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
    console.log('📝 Received registration request:', JSON.stringify(body, null, 2));

    // --- EXTRACT ALL FIELDS FROM BODY ---
    const {
      email,
      password,
      first_name,
      last_name,
      middle_name,
      other_names,
      gender,
      date_of_birth,
      place_of_birth,
      nationality,
      state_of_origin,
      lga,
      religion,
      blood_group,
      genotype,
      phone_number,
      home_address,
      residential_address,
      class_id,
      session_id,
      admission_date,
      branch_id,
      role = 'student',
      department,
      class_arm,
      house_id,
      club_id,
      transportation_status,
      pickup_location,
      bus_route_id,
      medical_info,
      doctor_name,
      hospital_name,
      allergies,
      medical_conditions,
      special_needs,
      previous_school,
      transfer_status,
      student_status,
      father_name,
      father_phone,
      father_email,
      father_occupation,
      mother_name,
      mother_phone,
      mother_email,
      mother_occupation,
      guardian_name,
      guardian_phone,
      guardian_email,
      guardian_address,
      guardian_relationship,
      emergency_contact_name,
      emergency_contact_phone,
      parent_id,
      documents,
      qr_code_data,
      barcode_data,
      allow_student_login,
      generate_password_automatically,
    } = body;

    // --- VALIDATE REQUIRED FIELDS ---
    if (!email) {
      console.error('❌ Email is missing');
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!branch_id) {
      console.error('❌ Branch ID is missing');
      return new Response(
        JSON.stringify({ error: 'Branch ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Invalid email format:', email);
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📧 Using email:', email);

    // --- GENERATE PASSWORD ---
    let finalPassword = password;
    if (!finalPassword || generate_password_automatically) {
      finalPassword = generateSecurePassword();
      console.log('🔑 Password generated automatically');
    }

    // --- GET BRANCH INFO ---
    const { data: branchData, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('branch_code, school_name')
      .eq('id', branch_id)
      .single();

    if (branchError) {
      console.error('❌ Branch fetch error:', branchError);
      return new Response(
        JSON.stringify({ error: 'Branch not found', details: branchError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const branchCode = branchData?.branch_code || 'EIS';
    console.log('🏫 Branch:', branchCode);

    // --- CREATE AUTH USER ---
    console.log(`🔐 Creating auth user for: ${email}`);
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: {
        first_name: first_name || 'Student',
        last_name: last_name || 'User',
        role: role,
        branch_id: branch_id,
      },
    });

    if (authError) {
      console.error('❌ Auth creation error:', authError);
      let errorMessage = 'Failed to create user account';
      if (authError.message.includes('duplicate')) {
        errorMessage = 'This email is already registered. Please use a different email.';
      } else if (authError.message.includes('invalid')) {
        errorMessage = 'Invalid email format. Please use a valid email address.';
      } else if (authError.message.includes('rate limit')) {
        errorMessage = 'Too many signup attempts. Please wait a moment and try again.';
      }
      return new Response(
        JSON.stringify({ error: errorMessage, details: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authData?.user) {
      return new Response(
        JSON.stringify({ error: 'Failed to create user account' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authUserId = authData.user.id;
    console.log(`✅ Auth user created: ${authUserId}`);

    // --- GET SESSION ---
    let activeSessionId = session_id;
    let sessionName = '';
    if (!activeSessionId) {
      const { data: sessionData, error: sessionError } = await supabaseAdmin
        .from('academic_sessions')
        .select('id, session_name')
        .eq('branch_id', branch_id)
        .eq('is_current', true)
        .single();

      if (!sessionError && sessionData) {
        activeSessionId = sessionData.id;
        sessionName = sessionData.session_name;
        console.log('📚 Using current session:', sessionName);
      } else {
        const { data: latestSession, error: latestError } = await supabaseAdmin
          .from('academic_sessions')
          .select('id, session_name')
          .eq('branch_id', branch_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!latestError && latestSession) {
          activeSessionId = latestSession.id;
          sessionName = latestSession.session_name;
          console.log('📚 Using latest session:', sessionName);
        } else {
          activeSessionId = 'ece1c2b5-43d6-4a30-9778-3617f5f2c829';
          sessionName = '2025-2026';
          console.log('📚 Using default session:', sessionName);
        }
      }
    }

    // --- GET OR CREATE DEFAULT CLASS ---
    let effectiveClassId = class_id;
    if (!effectiveClassId) {
      const { data: defaultClass, error: classError } = await supabaseAdmin
        .from('classes')
        .select('id')
        .eq('branch_id', branch_id)
        .eq('name', 'General')
        .maybeSingle();

      if (!classError && defaultClass) {
        effectiveClassId = defaultClass.id;
        console.log('📚 Using default class:', effectiveClassId);
      } else {
        const { data: newClass, error: createError } = await supabaseAdmin
          .from('classes')
          .insert([{
            name: 'General',
            code: 'GEN-001',
            branch_id: branch_id,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }])
          .select()
          .single();

        if (!createError && newClass) {
          effectiveClassId = newClass.id;
          console.log('📚 Created default class:', effectiveClassId);
        }
      }
    }

    // --- GENERATE ADMISSION NUMBER ---
    let admissionNumber = await generateAdmissionNumber(
      supabaseAdmin, 
      branch_id, 
      branchCode,
      activeSessionId,
      sessionName
    );

    if (!admissionNumber) {
      const timestamp = Date.now().toString().slice(-6);
      admissionNumber = `${branchCode}/${sessionName || '2025-2026'}/${timestamp}`;
    }
    console.log('✅ Admission number:', admissionNumber);

    // --- GENERATE OTHER IDs ---
    const studentId = await generateStudentId(supabaseAdmin, branch_id, branchCode);
    const userId = await generateUserId(supabaseAdmin, branch_id);

    // --- VALID ENUM VALUES ---
    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const validStudentStatus = ['active', 'inactive', 'graduated', 'transferred', 'suspended', 'expelled'];
    const validGenders = ['male', 'female', 'other'];

    // --- SANITIZE ENUM VALUES ---
    const sanitizedGender = gender && validGenders.includes(gender.toLowerCase()) ? gender.toLowerCase() : 'male';
    const sanitizedBloodGroup = blood_group && validBloodGroups.includes(blood_group) ? blood_group : null;
    const sanitizedStudentStatus = student_status && validStudentStatus.includes(student_status.toLowerCase()) 
      ? student_status.toLowerCase() 
      : 'active';

    // --- PREPARE DEFAULT VALUES ---
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // --- CREATE USER RECORD ---
    console.log('📝 Creating user record...');
    const userData = {
      id: authUserId,
      user_id: userId,
      email: email,
      phone_number: phone_number || null,
      first_name: first_name || 'Student',
      last_name: last_name || 'User',
      middle_name: middle_name || null,
      role: role,
      branch_id: branch_id,
      is_active: true,
      created_by: authUserId,
      created_at: now,
      updated_at: now,
      metadata: {
        student_id: studentId,
        admission_number: admissionNumber,
        created_via: 'admin_registration',
        branch: branchCode,
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

    // --- CREATE STUDENT RECORD ---
    console.log('📝 Creating student record with all form data...');
    const studentData = {
      id: authUserId,
      user_id: authUserId,
      student_id: studentId,
      admission_number: admissionNumber,
      admission_date: admission_date || today,
      first_name: first_name || 'Student',
      middle_name: middle_name || null,
      last_name: last_name || 'User',
      other_names: other_names || null,
      gender: sanitizedGender,
      date_of_birth: date_of_birth || today,
      place_of_birth: place_of_birth || null,
      nationality: nationality || 'Nigerian',
      state_of_origin: state_of_origin || null,
      lga: lga || null,
      religion: religion || null,
      blood_group: sanitizedBloodGroup,
      genotype: genotype || null,
      phone_number: phone_number || null,
      email: email,
      home_address: home_address || 'No Address Provided',
      residential_address: residential_address || home_address || 'No Address Provided',
      branch_id: branch_id,
      department: department || null,
      class_id: effectiveClassId || null,
      class_arm: class_arm || null,
      house_id: house_id || null,
      club_id: club_id || null,
      transportation_status: transportation_status || false,
      pickup_location: pickup_location || null,
      bus_route_id: bus_route_id || null,
      medical_info: medical_info || null,
      doctor_name: doctor_name || null,
      hospital_name: hospital_name || null,
      allergies: allergies || null,
      medical_conditions: medical_conditions || null,
      special_needs: special_needs || null,
      previous_school: previous_school || null,
      transfer_status: transfer_status || false,
      admission_status: 'admitted',
      current_status: sanitizedStudentStatus,
      emergency_contact: emergency_contact_name ? {
        name: emergency_contact_name,
        phone: emergency_contact_phone || null,
        relationship: guardian_relationship || 'Parent',
      } : null,
      parent_id: parent_id || null,
      guardian_info: {
        father_name: father_name || null,
        mother_name: mother_name || null,
        father_phone: father_phone || null,
        mother_phone: mother_phone || null,
        father_email: father_email || null,
        mother_email: mother_email || null,
        father_occupation: father_occupation || null,
        mother_occupation: mother_occupation || null,
        guardian_name: guardian_name || null,
        guardian_phone: guardian_phone || null,
        guardian_email: guardian_email || null,
        guardian_address: guardian_address || null,
        relationship: guardian_relationship || null,
      },
      documents: documents || [],
      qr_code_data: qr_code_data || null,
      barcode_data: barcode_data || null,
      session_id: activeSessionId || null,
      created_by: authUserId,
      created_at: now,
      updated_at: now,
      metadata: {
        registered_via: 'ERP',
        created_by: 'Admin',
        auth_user_id: authUserId,
        branch: branchCode,
        session: sessionName,
      },
    };

    // Remove undefined values
    Object.keys(studentData).forEach((key) => {
      if (studentData[key] === undefined) {
        delete studentData[key];
      }
    });

    console.log('📝 Student data:', JSON.stringify(studentData, null, 2));

    const { error: studentError } = await supabaseAdmin
      .from('students')
      .insert([studentData]);

    if (studentError) {
      console.error('❌ Student record creation error:', studentError);
      console.error('❌ Student data that failed:', JSON.stringify(studentData, null, 2));
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      await supabaseAdmin.from('users').delete().eq('id', authUserId);
      return new Response(
        JSON.stringify({ error: 'Failed to create student record', details: studentError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Student registered successfully!');

    // ============================================
    // 🎯 CRITICAL FIX: ASSIGN FEES TO STUDENT
    // ============================================
    console.log('📝 Assigning fees to student...');

    // Call the fee assignment function
    const { data: feeAssignResult, error: feeAssignError } = await supabaseAdmin.rpc(
      'assign_fees_to_student',
      { p_student_id: authUserId }
    );

    if (feeAssignError) {
      console.error('⚠️ Fee assignment warning:', feeAssignError);
      // Don't fail the registration if fee assignment fails
      // Log it but continue
    } else {
      console.log('✅ Fees assigned successfully:', feeAssignResult);
    }

    // ============================================
    // 🎯 ALSO LOG THE ASSIGNMENT FOR DEBUGGING
    // ============================================
    // Check what fees were assigned
    const { data: assignedFees, error: checkError } = await supabaseAdmin
      .from('student_fee_assignments')
      .select('id, fee_id, fee_name, term, session, class_id, class_name, amount_due')
      .eq('student_id', authUserId);

    if (checkError) {
      console.error('⚠️ Could not fetch assigned fees:', checkError);
    } else {
      console.log(`📊 ${assignedFees?.length || 0} fees assigned to student`);
      if (assignedFees && assignedFees.length > 0) {
        console.log('📋 Assigned fees:', JSON.stringify(assignedFees, null, 2));
      } else {
        console.log('⚠️ No fees were assigned. Check if fees exist for this class and term.');
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Student registered successfully',
        data: {
          auth_user_id: authUserId,
          user_id: userId,
          student_id: studentId,
          admission_number: admissionNumber,
          email: email,
          password: finalPassword,
          first_name: first_name || 'Student',
          last_name: last_name || 'User',
          branch: branchCode,
          fees_assigned: assignedFees?.length || 0,
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

async function generateAdmissionNumber(
  supabaseAdmin: any, 
  branchId: string,
  branchCode: string,
  sessionId: string | null,
  sessionName: string
): Promise<string> {
  try {
    const sessionYear = sessionName || '2025-2026';
    
    const { count, error } = await supabaseAdmin
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', branchId)
      .eq('session_id', sessionId)
      .like('admission_number', `${branchCode}/${sessionYear}/%`);

    if (error) {
      const { count: totalCount } = await supabaseAdmin
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', branchId);
      
      const sequence = (totalCount || 0) + 1;
      return `${branchCode}/${sessionYear}/${String(sequence).padStart(3, '0')}`;
    }

    const sequence = (count || 0) + 1;
    return `${branchCode}/${sessionYear}/${String(sequence).padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating admission number:', error);
    const timestamp = Date.now().toString().slice(-6);
    const sessionYear = sessionName || '2025-2026';
    return `${branchCode}/${sessionYear}/${timestamp}`;
  }
}

async function generateStudentId(supabaseAdmin: any, branchId: string, branchCode: string): Promise<string> {
  try {
    const year = new Date().getFullYear();
    const { count, error } = await supabaseAdmin
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', branchId);

    if (error) throw error;
    const sequence = (count || 0) + 1;
    return `${branchCode}/EBE/${year}/${String(sequence).padStart(6, '0')}`;
  } catch (error) {
    console.error('Error generating student ID:', error);
    const year = new Date().getFullYear();
    return `${branchCode}/EBE/${year}/${String(Math.floor(Math.random() * 100000)).padStart(6, '0')}`;
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