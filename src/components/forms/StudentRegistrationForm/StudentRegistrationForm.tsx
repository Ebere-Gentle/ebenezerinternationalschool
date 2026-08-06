
// import React, { useState, useEffect, useRef } from 'react';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { motion, AnimatePresence } from 'framer-motion';
// import { supabase } from '../../../config/supabase/client';
// import { useAuth } from '../../../hooks/useAuth';
// import { studentService } from '../../../services/api/student.service';
// import toast from 'react-hot-toast';
// import dayjs from 'dayjs';
// import * as XLSX from 'xlsx';
// import {
//   User,
//   Mail,
//   GraduationCap,
//   Users,
//   Heart,
//   Lock,
//   Notebook,
//   Upload,
//   ArrowLeft,
//   Download,
//   Eye,
//   History,
//   AlertCircle,
//   RefreshCw,
//   PlusCircle,
//   Save,
//   FileText,
//   QrCode,
//   Building,
//   Phone,
//   MapPin,
//   Calendar,
//   Globe,
//   Home,
//   Stethoscope,
//   Pill,
//   AlertTriangle,
//   HelpCircle,
//   Info,
//   CloudUpload,
//   Check,
//   Loader2,
//   Camera,
//   X
// } from 'lucide-react';

// // Types
// type StudentFormData = z.infer<typeof studentSchema>;

// // Nigerian States and LGAs Data
// const nigerianStates: { [key: string]: string[] } = {
//   'Abia': ['Aba North', 'Aba South', 'Arochukwu', 'Bende', 'Ikwuano', 'Isiala Ngwa North', 'Isiala Ngwa South', 'Isuikwuato', 'Obi Ngwa', 'Ohafia', 'Osisioma', 'Ugwunagbo', 'Ukwa East', 'Ukwa West', 'Umuahia North', 'Umuahia South', 'Umu Nneochi'],
//   'Adamawa': ['Demsa', 'Fufure', 'Ganye', 'Girei', 'Gombi', 'Guyuk', 'Hong', 'Jada', 'Lamurde', 'Madagali', 'Maiha', 'Mayo Belwa', 'Michika', 'Mubi North', 'Mubi South', 'Numan', 'Shelleng', 'Song', 'Toungo', 'Yola North', 'Yola South'],
//   'Akwa Ibom': ['Abak', 'Eastern Obolo', 'Eket', 'Esit Eket', 'Essien Udim', 'Etim Ekpo', 'Etinan', 'Ibeno', 'Ibesikpo Asutan', 'Ibiono Ibom', 'Ika', 'Ikono', 'Ikot Abasi', 'Ikot Ekpene', 'Ini', 'Itu', 'Mbo', 'Mkpat Enin', 'Nsit Atai', 'Nsit Ibom', 'Nsit Ubium', 'Obot Akara', 'Okobo', 'Onna', 'Oron', 'Oruk Anam', 'Udung Uko', 'Ukanafun', 'Uruan', 'Urue Offong/Oruko', 'Uyo'],
//   'Anambra': ['Aguata', 'Anambra East', 'Anambra West', 'Anaocha', 'Awka North', 'Awka South', 'Ayamelum', 'Dunukofia', 'Ekwusigo', 'Idemili North', 'Idemili South', 'Ihiala', 'Njikoka', 'Nnewi North', 'Nnewi South', 'Ogbaru', 'Onitsha North', 'Onitsha South', 'Orumba North', 'Orumba South', 'Oyi'],
//   'Bauchi': ['Alkaleri', 'Bauchi', 'Bogoro', 'Damban', 'Darazo', 'Dass', 'Gamawa', 'Ganjuwa', 'Giade', 'Itas/Gadau', 'Jama\'are', 'Katagum', 'Kirfi', 'Misau', 'Ningi', 'Shira', 'Tafawa Balewa', 'Toro', 'Warji', 'Zaki'],
//   'Bayelsa': ['Brass', 'Ekeremor', 'Kolokuma/Opokuma', 'Nembe', 'Ogbia', 'Sagbama', 'Southern Ijaw', 'Yenagoa'],
//   'Benue': ['Ado', 'Agatu', 'Apa', 'Buruku', 'Gboko', 'Guma', 'Gwer East', 'Gwer West', 'Katsina-Ala', 'Konshisha', 'Kwande', 'Logo', 'Makurdi', 'Obi', 'Ogbadibo', 'Ohimini', 'Oju', 'Okpokwu', 'Oturkpo', 'Tarka', 'Ukum', 'Ushongo', 'Vandeikya'],
//   'Borno': ['Abadam', 'Askira/Uba', 'Bama', 'Bayo', 'Biu', 'Chibok', 'Damboa', 'Dikwa', 'Gubio', 'Guzamala', 'Gwoza', 'Hawul', 'Jere', 'Kaga', 'Kala/Balge', 'Konduga', 'Kukawa', 'Kwaya Kusar', 'Mafa', 'Magumeri', 'Maiduguri', 'Marte', 'Mobbar', 'Monguno', 'Ngala', 'Nganzai', 'Shani'],
//   'Cross River': ['Abi', 'Akamkpa', 'Akpabuyo', 'Bakassi', 'Bekwarra', 'Biase', 'Boki', 'Calabar Municipal', 'Calabar South', 'Etung', 'Ikom', 'Obanliku', 'Obubra', 'Obudu', 'Odukpani', 'Ogoja', 'Yakuur', 'Yala'],
//   'Delta': ['Aniocha North', 'Aniocha South', 'Bomadi', 'Burutu', 'Ethiope East', 'Ethiope West', 'Ika North East', 'Ika South', 'Isoko North', 'Isoko South', 'Ndokwa East', 'Ndokwa West', 'Okpe', 'Oshimili North', 'Oshimili South', 'Patani', 'Sapele', 'Udu', 'Ughelli North', 'Ughelli South', 'Ukwuani', 'Uvwie', 'Warri North', 'Warri South', 'Warri South West'],
//   'Ebonyi': ['Abakaliki', 'Afikpo North', 'Afikpo South', 'Ebonyi', 'Ezza North', 'Ezza South', 'Ikwo', 'Ishielu', 'Ivo', 'Izzi', 'Ohaozara', 'Ohaukwu', 'Onicha'],
//   'Edo': ['Akoko-Edo', 'Egor', 'Esan Central', 'Esan North-East', 'Esan South-East', 'Esan West', 'Etsako Central', 'Etsako East', 'Etsako West', 'Igueben', 'Ikpoba-Okha', 'Oredo', 'Orhionmwon', 'Ovia North-East', 'Ovia South-West', 'Owan East', 'Owan West', 'Uhunmwonde'],
//   'Ekiti': ['Ado Ekiti', 'Efon', 'Ekiti East', 'Ekiti South-West', 'Ekiti West', 'Emure', 'Gbonyin', 'Ido Osi', 'Ijero', 'Ikere', 'Ikole', 'Ilejemeje', 'Irepodun/Ifelodun', 'Ise/Orun', 'Moba', 'Oye'],
//   'Enugu': ['Aninri', 'Awgu', 'Enugu East', 'Enugu North', 'Enugu South', 'Ezeagu', 'Igbo Etiti', 'Igbo Eze North', 'Igbo Eze South', 'Isi Uzo', 'Nkanu East', 'Nkanu West', 'Nsukka', 'Oji River', 'Udenu', 'Udi', 'Uzo Uwani'],
//   'FCT': ['Abaji', 'Bwari', 'Gwagwalada', 'Kuje', 'Kwali', 'Municipal Area Council'],
//   'Gombe': ['Akko', 'Balanga', 'Billiri', 'Dukku', 'Funakaye', 'Gombe', 'Kaltungo', 'Kwami', 'Nafada', 'Shongom', 'Yamaltu/Deba'],
//   'Imo': ['Aboh Mbaise', 'Ahiazu Mbaise', 'Ehime Mbano', 'Ezinihitte', 'Ideato North', 'Ideato South', 'Ihitte/Uboma', 'Ikeduru', 'Isiala Mbano', 'Isu', 'Mbaitoli', 'Ngor Okpala', 'Njaba', 'Nkwerre', 'Nwangele', 'Obowo', 'Oguta', 'Ohaji/Egbema', 'Okigwe', 'Onuimo', 'Orlu', 'Orsu', 'Oru East', 'Oru West', 'Owerri Municipal', 'Owerri North', 'Owerri West', 'Unuimo'],
//   'Jigawa': ['Auyo', 'Babura', 'Biriniwa', 'Birnin Kudu', 'Buji', 'Dutse', 'Gagarawa', 'Garki', 'Gumel', 'Guri', 'Gwaram', 'Gwiwa', 'Hadejia', 'Jahun', 'Kafin Hausa', 'Kaugama', 'Kazaure', 'Kiri Kasama', 'Kiyawa', 'Kaugama', 'Maigatari', 'Malam Madori', 'Miga', 'Ringim', 'Roni', 'Sule Tankarkar', 'Taura', 'Yankwashi'],
//   'Kaduna': ['Birnin Gwari', 'Chikun', 'Giwa', 'Igabi', 'Ikara', 'Jaba', 'Jema\'a', 'Kachia', 'Kaduna North', 'Kaduna South', 'Kagarko', 'Kajuru', 'Kaura', 'Kauru', 'Kubau', 'Kudan', 'Lere', 'Makarfi', 'Sabon Gari', 'Sanga', 'Soba', 'Zangon Kataf', 'Zaria'],
//   'Kano': ['Ajingi', 'Albasu', 'Bagwai', 'Bebeji', 'Bichi', 'Bunkure', 'Dala', 'Dambatta', 'Dawakin Kudu', 'Dawakin Tofa', 'Doguwa', 'Fagge', 'Gabasawa', 'Garko', 'Garun Mallam', 'Gaya', 'Gezawa', 'Gwale', 'Gwarzo', 'Kabo', 'Kano Municipal', 'Karaye', 'Kibiya', 'Kiru', 'Kumbotso', 'Kunchi', 'Kura', 'Madobi', 'Makoda', 'Minjibir', 'Nasarawa', 'Rano', 'Rimin Gado', 'Rogo', 'Shanono', 'Sumaila', 'Takai', 'Tarauni', 'Tofa', 'Tsanyawa', 'Tudun Wada', 'Ungogo', 'Warawa', 'Wudil'],
//   'Katsina': ['Bakori', 'Batagarawa', 'Batsari', 'Baure', 'Bindawa', 'Charanchi', 'Dandume', 'Danja', 'Dan Musa', 'Daura', 'Dutsi', 'Dutsin Ma', 'Faskari', 'Funtua', 'Ingawa', 'Jibia', 'Kafur', 'Kaita', 'Kankara', 'Kankia', 'Katsina', 'Kurfi', 'Kusada', 'Mai\'Adua', 'Malumfashi', 'Mani', 'Mashi', 'Matazu', 'Musawa', 'Rimi', 'Sabuwa', 'Safana', 'Sandamu', 'Zango'],
//   'Kebbi': ['Aleiro', 'Arewa Dandi', 'Argungu', 'Augie', 'Bagudo', 'Birnin Kebbi', 'Bunza', 'Dandi', 'Fakai', 'Gwandu', 'Jega', 'Kalgo', 'Koko/Besse', 'Maiyama', 'Ngaski', 'Sakaba', 'Shanga', 'Suru', 'Wasagu/Danko', 'Yauri', 'Zuru'],
//   'Kogi': ['Adavi', 'Ajaokuta', 'Ankpa', 'Bassa', 'Dekina', 'Ibaji', 'Idah', 'Igalamela Odolu', 'Ijumu', 'Kabba/Bunu', 'Kogi', 'Lokoja', 'Mopa Muro', 'Ofu', 'Ogori/Magongo', 'Okehi', 'Okene', 'Olamaboro', 'Omala', 'Yagba East', 'Yagba West'],
//   'Kwara': ['Asa', 'Baruten', 'Edu', 'Ekiti', 'Ifelodun', 'Ilorin East', 'Ilorin South', 'Ilorin West', 'Irepodun', 'Isin', 'Kaiama', 'Moro', 'Offa', 'Oke Ero', 'Oyun', 'Pategi'],
//   'Lagos': ['Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa', 'Badagry', 'Epe', 'Eti Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye', 'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland', 'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'],
//   'Nasarawa': ['Akwanga', 'Awe', 'Doma', 'Karu', 'Keana', 'Keffi', 'Kokona', 'Lafia', 'Nasarawa', 'Nasarawa Egon', 'Obi', 'Toto', 'Wamba'],
//   'Niger': ['Agaie', 'Agwara', 'Bida', 'Borgu', 'Bosso', 'Chanchaga', 'Edati', 'Gbako', 'Gurara', 'Katcha', 'Kontagora', 'Lapai', 'Lavun', 'Magama', 'Mariga', 'Mashegu', 'Mokwa', 'Moya', 'Paikoro', 'Rafi', 'Rijau', 'Shiroro', 'Suleja', 'Tafa', 'Wushishi'],
//   'Ogun': ['Abeokuta North', 'Abeokuta South', 'Ado-Odo/Ota', 'Egbado North', 'Egbado South', 'Ewekoro', 'Ifo', 'Ijebu East', 'Ijebu North', 'Ijebu North East', 'Ijebu Ode', 'Ikenne', 'Imeko Afon', 'Ipokia', 'Obafemi Owode', 'Odeda', 'Odogbolu', 'Ogun Waterside', 'Remo North', 'Shagamu'],
//   'Ondo': ['Akoko North-East', 'Akoko North-West', 'Akoko South-East', 'Akoko South-West', 'Akure North', 'Akure South', 'Ese Odo', 'Idanre', 'Ifedore', 'Ilaje', 'Ile Oluji/Okeigbo', 'Irele', 'Odigbo', 'Okitipupa', 'Ondo East', 'Ondo West', 'Ose', 'Owo'],
//   'Osun': ['Atakunmosa East', 'Atakunmosa West', 'Aiyedaade', 'Aiyedire', 'Boluwaduro', 'Boripe', 'Ede North', 'Ede South', 'Egbedore', 'Ejigbo', 'Ife Central', 'Ife East', 'Ife North', 'Ife South', 'Ila', 'Ilesa East', 'Ilesa West', 'Irepodun', 'Irewole', 'Isokan', 'Iwo', 'Obokun', 'Odo Otin', 'Ola Oluwa', 'Olorunda', 'Oriade', 'Orolu', 'Osogbo'],
//   'Oyo': ['Afijio', 'Akinyele', 'Atiba', 'Atisbo', 'Egbeda', 'Ibadan North', 'Ibadan North-East', 'Ibadan North-West', 'Ibadan South-East', 'Ibadan South-West', 'Ibarapa Central', 'Ibarapa East', 'Ibarapa North', 'Ido', 'Irepo', 'Iseyin', 'Itesiwaju', 'Iwajowa', 'Kajola', 'Lagelu', 'Ogbomosho North', 'Ogbomosho South', 'Ogo Oluwa', 'Olorunsogo', 'Oluyole', 'Ona Ara', 'Orelope', 'Ori Ire', 'Oyo', 'Oyo East', 'Saki East', 'Saki West', 'Surulere'],
//   'Plateau': ['Barkin Ladi', 'Bassa', 'Bokkos', 'Jos East', 'Jos North', 'Jos South', 'Kanam', 'Kanke', 'Langtang North', 'Langtang South', 'Mangu', 'Mikang', 'Pankshin', 'Qua\'an Pan', 'Riyom', 'Shendam', 'Wase'],
//   'Rivers': ['Abua/Odual', 'Ahoada East', 'Ahoada West', 'Akuku-Toru', 'Andoni', 'Asari-Toru', 'Bonny', 'Degema', 'Eleme', 'Emuoha', 'Etche', 'Gokana', 'Ikwerre', 'Khana', 'Obio/Akpor', 'Ogba/Egbema/Ndoni', 'Ogu/Bolo', 'Okrika', 'Omuma', 'Opobo/Nkoro', 'Oyigbo', 'Port Harcourt', 'Tai'],
//   'Sokoto': ['Binji', 'Bodinga', 'Dange Shuni', 'Gada', 'Goronyo', 'Gudu', 'Gwadabawa', 'Illela', 'Isa', 'Kebbe', 'Kware', 'Rabah', 'Sabon Birni', 'Shagari', 'Silame', 'Sokoto North', 'Sokoto South', 'Tambuwal', 'Tangaza', 'Tureta', 'Wamako', 'Wurno', 'Yabo'],
//   'Taraba': ['Ardo Kola', 'Bali', 'Donga', 'Gashaka', 'Gassol', 'Ibi', 'Jalingo', 'Karim Lamido', 'Kumi', 'Lau', 'Sardauna', 'Takum', 'Ussa', 'Wukari', 'Yorro', 'Zing'],
//   'Yobe': ['Bade', 'Bursari', 'Damaturu', 'Fika', 'Fune', 'Geidam', 'Gujba', 'Gulani', 'Jakusko', 'Karasuwa', 'Machina', 'Nangere', 'Nguru', 'Potiskum', 'Tarmuwa', 'Yunusari', 'Yusufari'],
//   'Zamfara': ['Anka', 'Bakura', 'Birnin Magaji/Kiyaw', 'Bukkuyum', 'Bungudu', 'Gummi', 'Gusau', 'Kaura Namoda', 'Maradun', 'Maru', 'Shinkafi', 'Talata Mafara', 'Chafe', 'Zurmi']
// };

// // Form Components
// interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
//   label: string;
//   icon?: React.ElementType;
//   error?: { message?: string };
//   required?: boolean;
// }

// interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
//   label: string;
//   icon?: React.ElementType;
//   error?: { message?: string };
//   options: Array<{ value: string; label: string }>;
//   loading?: boolean;
//   required?: boolean;
// }

// interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
//   label: string;
//   icon?: React.ElementType;
//   error?: { message?: string };
//   required?: boolean;
// }

// // Zod Schema
// const studentSchema = z.object({
//   first_name: z.string().optional(),
//   middle_name: z.string().optional(),
//   last_name: z.string().optional(),
//   other_names: z.string().optional(),
//   gender: z.string().optional(),
//   date_of_birth: z.string().optional(),
//   place_of_birth: z.string().optional(),
//   nationality: z.string().optional(),
//   state_of_origin: z.string().optional(),
//   lga: z.string().optional(),
//   religion: z.string().optional(),
//   blood_group: z.string().optional(),
//   genotype: z.string().optional(),
//   admission_number: z.string().optional(),
//   student_id: z.string().optional(),
//   qr_code: z.string().optional(),
//   passport_photo: z.string().optional(),

//   email: z
//     .string()
//     .trim()
//     .min(1, 'Email is required')
//     .email('Please enter a valid email address'),
  
//   phone_number: z.string().optional(),
//   alternative_phone: z.string().optional(),
//   home_address: z.string().optional(),
//   residential_address: z.string().optional(),
//   country: z.string().optional(),
//   state: z.string().optional(),
//   city: z.string().optional(),
//   postal_code: z.string().optional(),

//   academic_session: z.string().optional(),
//   term: z.string().optional(),
//   admission_date: z.string().optional(),
//   department: z.string().optional(),
//   class_id: z.string().optional(),
//   class_arm: z.string().optional(),
//   roll_number: z.string().optional(),
//   house: z.string().optional(),
//   house_id: z.string().optional(),
//   school_bus: z.string().optional(),
//   bus_route_id: z.string().optional(),
//   hostel: z.string().optional(),
//   transportation_status: z.boolean().default(false),
//   pickup_location: z.string().optional(),
//   previous_school: z.string().optional(),
//   previous_class: z.string().optional(),
//   student_status: z.string().default('active'),
//   transfer_status: z.boolean().default(false),

//   father_name: z.string().optional(),
//   father_phone: z.string().optional(),
//   father_email: z.string().optional(),
//   father_occupation: z.string().optional(),
//   mother_name: z.string().optional(),
//   mother_phone: z.string().optional(),
//   mother_email: z.string().optional(),
//   mother_occupation: z.string().optional(),
//   guardian_name: z.string().optional(),
//   guardian_phone: z.string().optional(),
//   guardian_email: z.string().optional(),
//   guardian_address: z.string().optional(),
//   guardian_relationship: z.string().optional(),
//   emergency_contact_name: z.string().optional(),
//   emergency_contact_phone: z.string().optional(),

//   doctor_name: z.string().optional(),
//   hospital_name: z.string().optional(),
//   doctor_phone: z.string().optional(),
//   medical_conditions: z.string().optional(),
//   allergies: z.string().optional(),
//   special_needs: z.string().optional(),
//   medication: z.string().optional(),
//   health_notes: z.string().optional(),
//   medical_info: z.string().optional(),

//   student_username: z.string().optional(),
//   password: z.string().optional(),
//   confirm_password: z.string().optional(),
//   allow_student_login: z.boolean().default(false),
//   generate_password_automatically: z.boolean().default(false),

//   student_bio: z.string().optional(),
//   notes: z.string().optional(),
//   remarks: z.string().optional(),
//   documents: z.array(z.string()).optional(),
//   parent_id: z.string().optional(),
//   club_id: z.string().optional(),
//   barcode: z.string().optional(),
// });

// // FormInput Component
// const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
//   ({ label, icon: Icon, error, required = false, className = '', ...props }, ref) => {
//     return (
//       <div className="space-y-1.5">
//         <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
//           {Icon && <Icon className="w-4 h-4 text-gray-400" />}
//           {label}
//           {required && <span className="text-red-500">*</span>}
//         </label>
//         <input
//           ref={ref}
//           className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200 ${error ? 'border-red-500 ring-2 ring-red-200' : ''} ${className}`}
//           {...props}
//         />
//         <AnimatePresence>
//           {error?.message && (
//             <motion.p
//               initial={{ opacity: 0, y: -10 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: -10 }}
//               className="text-sm text-red-500 flex items-center gap-1"
//             >
//               <AlertCircle className="w-3.5 h-3.5" />
//               {error.message}
//             </motion.p>
//           )}
//         </AnimatePresence>
//       </div>
//     );
//   }
// );
// FormInput.displayName = 'FormInput';

// // FormSelect Component
// const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
//   ({ label, icon: Icon, error, options, loading = false, required = false, className = '', ...props }, ref) => {
//     return (
//       <div className="space-y-1.5">
//         <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
//           {Icon && <Icon className="w-4 h-4 text-gray-400" />}
//           {label}
//           {required && <span className="text-red-500">*</span>}
//         </label>
//         <select
//           ref={ref}
//           className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200 ${error ? 'border-red-500 ring-2 ring-red-200' : ''} ${className}`}
//           {...props}
//           disabled={loading}
//         >
//           <option value="">Select {label}</option>
//           {options.map((opt) => (
//             <option key={opt.value} value={opt.value}>
//               {opt.label}
//             </option>
//           ))}
//         </select>
//         <AnimatePresence>
//           {error?.message && (
//             <motion.p
//               initial={{ opacity: 0, y: -10 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: -10 }}
//               className="text-sm text-red-500 flex items-center gap-1"
//             >
//               <AlertCircle className="w-3.5 h-3.5" />
//               {error.message}
//             </motion.p>
//           )}
//         </AnimatePresence>
//       </div>
//     );
//   }
// );
// FormSelect.displayName = 'FormSelect';

// // FormTextarea Component
// const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
//   ({ label, icon: Icon, error, required = false, className = '', ...props }, ref) => {
//     return (
//       <div className="space-y-1.5">
//         <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
//           {Icon && <Icon className="w-4 h-4 text-gray-400" />}
//           {label}
//           {required && <span className="text-red-500">*</span>}
//         </label>
//         <textarea
//           ref={ref}
//           className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200 ${error ? 'border-red-500 ring-2 ring-red-200' : ''} ${className}`}
//           {...props}
//         />
//         <AnimatePresence>
//           {error?.message && (
//             <motion.p
//               initial={{ opacity: 0, y: -10 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: -10 }}
//               className="text-sm text-red-500 flex items-center gap-1"
//             >
//               <AlertCircle className="w-3.5 h-3.5" />
//               {error.message}
//             </motion.p>
//           )}
//         </AnimatePresence>
//       </div>
//     );
//   }
// );
// FormTextarea.displayName = 'FormTextarea';

// // Section Card Component
// interface SectionCardProps {
//   icon: React.ElementType;
//   title: string;
//   children: React.ReactNode;
//   className?: string;
// }

// const SectionCard: React.FC<SectionCardProps> = ({ 
//   icon: Icon, 
//   title, 
//   children, 
//   className = '' 
// }) => {
//   return (
//     <motion.div
//       initial={{ opacity: 0, y: 20 }}
//       animate={{ opacity: 1, y: 0 }}
//       transition={{ duration: 0.5 }}
//       className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 ${className}`}
//     >
//       <div className="p-6">
//         <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
//           <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl text-white">
//             <Icon className="w-5 h-5" />
//           </div>
//           <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
//         </div>
//         <div className="space-y-6">{children}</div>
//       </div>
//     </motion.div>
//   );
// };

// // Email existence check
// const checkEmailExists = async (email: string): Promise<boolean> => {
//   try {
//     const { data: studentData } = await supabase
//       .from('students')
//       .select('email')
//       .eq('email', email.trim())
//       .maybeSingle();

//     if (studentData) return true;

//     const { data: userData } = await supabase
//       .from('users')
//       .select('email')
//       .eq('email', email.trim())
//       .maybeSingle();

//     if (userData) return true;

//     return false;
//   } catch (error) {
//     console.error('Error checking email:', error);
//     return false;
//   }
// };

// // Main Component
// const StudentRegistrationForm: React.FC = () => {
//   const { user } = useAuth();
//   const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
//   const [files, setFiles] = useState<any[]>([]);
//   const [isDragging, setIsDragging] = useState<boolean>(false);
//   const [uploadProgress, setUploadProgress] = useState<number>(0);
//   const [branchId, setBranchId] = useState<string>('');
//   const [branchName, setBranchName] = useState<string>('');
//   const [classOptions, setClassOptions] = useState<Array<{ value: string; label: string }>>([]);
//   const [houseOptions, setHouseOptions] = useState<Array<{ value: string; label: string }>>([]);
//   const [loadingClasses, setLoadingClasses] = useState<boolean>(false);
//   const [loadingHouses, setLoadingHouses] = useState<boolean>(false);
//   const [loadingBranch, setLoadingBranch] = useState<boolean>(true);
//   const [authUserId, setAuthUserId] = useState<string | null>(null);
//   const [isCheckingEmail, setIsCheckingEmail] = useState<boolean>(false);
//   const [currentSession, setCurrentSession] = useState<string>('');
//   const [currentTerm, setCurrentTerm] = useState<string>('');
  
//   // State and LGA options
//   const stateOptions = Object.keys(nigerianStates).map(state => ({
//     value: state,
//     label: state
//   }));
  
//   const [lgaOptions, setLgaOptions] = useState<Array<{ value: string; label: string }>>([]);
  
//   // Photo states
//   const [photoFile, setPhotoFile] = useState<File | null>(null);
//   const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
//   // Import states
//   const [showPreview, setShowPreview] = useState<boolean>(false);
//   const [importRecords, setImportRecords] = useState<any[]>([]);
//   const [importing, setImporting] = useState<boolean>(false);
//   const [importHistory, setImportHistory] = useState<any[]>([]);
//   const [showHistory, setShowHistory] = useState<boolean>(false);
//   const fileInputRef = useRef<HTMLInputElement>(null);
//   const emailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

//   // useForm
//   const {
//     register,
//     handleSubmit,
//     watch,
//     setValue,
//     setError,
//     clearErrors,
//     reset,
//     formState: { errors },
//   } = useForm<StudentFormData>({
//     resolver: zodResolver(studentSchema),
//     defaultValues: {
//       nationality: 'Nigerian',
//       student_status: 'active',
//       allow_student_login: true,
//       generate_password_automatically: true,
//       admission_date: dayjs().format('YYYY-MM-DD'),
//       academic_session: '',
//       term: '',
//       gender: 'male',
//       transportation_status: false,
//       transfer_status: false,
//       password: '1234567',
//       confirm_password: '1234567',
//       country: 'Nigeria',
//     },
//     mode: 'all',
//     reValidateMode: 'onChange',
//   });

//   const watchedClassId = watch('class_id');
//   const watchedEmail = watch('email', '');
//   const watchedPassword = watch('password', '1234567');
//   const watchedStateOfOrigin = watch('state_of_origin', '');

//   // Auto-fill student username with FULL email
//   useEffect(() => {
//     if (watchedEmail) {
//       setValue('student_username', watchedEmail);
//     }
//   }, [watchedEmail, setValue]);

//   // Update LGA options when state changes
//   useEffect(() => {
//     if (watchedStateOfOrigin && nigerianStates[watchedStateOfOrigin]) {
//       const lgas = nigerianStates[watchedStateOfOrigin].map(lga => ({
//         value: lga,
//         label: lga
//       }));
//       setLgaOptions(lgas);
//     } else {
//       setLgaOptions([]);
//     }
//   }, [watchedStateOfOrigin]);

//   // Ensure password stays as default
//   useEffect(() => {
//     if (!watchedPassword || watchedPassword === '') {
//       setValue('password', '1234567');
//       setValue('confirm_password', '1234567');
//     }
//   }, [watchedPassword, setValue]);

//   // Email validation effect
//   useEffect(() => {
//     if (emailTimeoutRef.current) {
//       clearTimeout(emailTimeoutRef.current);
//     }

//     const email = watchedEmail?.trim();
    
//     if (!email) {
//       clearErrors('email');
//       return;
//     }

//     const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
//     if (!isValidFormat) {
//       return;
//     }

//     setIsCheckingEmail(true);
//     emailTimeoutRef.current = setTimeout(async () => {
//       try {
//         const exists = await checkEmailExists(email);
//         if (exists) {
//           setError('email', { 
//             type: 'manual', 
//             message: 'This email is already registered. Please use a different email.' 
//           });
//         } else {
//           clearErrors('email');
//         }
//       } catch (error) {
//         console.error('Error checking email:', error);
//       } finally {
//         setIsCheckingEmail(false);
//       }
//     }, 500);

//     return () => {
//       if (emailTimeoutRef.current) {
//         clearTimeout(emailTimeoutRef.current);
//       }
//     };
//   }, [watchedEmail, setError, clearErrors]);

//   // Get authenticated user
//   useEffect(() => {
//     const getAuthUser = async () => {
//       const { data: { user: authUser }, error } = await supabase.auth.getUser();
//       if (error) {
//         console.error('Error getting auth user:', error);
//         toast.error('Please login to continue');
//         setLoadingBranch(false);
//         return;
//       }
//       if (authUser) {
//         setAuthUserId(authUser.id);
//         await loadUserBranch(authUser.id);
//         await loadImportHistory();
//         await loadCurrentAcademicPeriod();
//       } else {
//         toast.error('Please login to continue');
//         setLoadingBranch(false);
//       }
//     };
//     getAuthUser();
//   }, []);

//   // When class changes, auto-fill department
//   useEffect(() => {
//     if (watchedClassId && classOptions.length > 0) {
//       const selected = classOptions.find(c => c.value === watchedClassId);
//       if (selected) {
//         const dept = selected.label.split(' - ')[1] || '';
//         setValue('department', dept);
//       }
//     }
//   }, [watchedClassId, classOptions, setValue]);

//   // Load current academic period
//   const loadCurrentAcademicPeriod = async () => {
//     try {
//       // Get current academic session from the database
//       const { data: sessionData, error: sessionError } = await supabase
//         .from('academic_sessions')
//         .select('session_name, term_name')
//         .eq('is_current', true)
//         .limit(1)
//         .single();

//       if (!sessionError && sessionData) {
//         setCurrentSession(sessionData.session_name);
//         setCurrentTerm(sessionData.term_name);
//         setValue('academic_session', sessionData.session_name);
//         setValue('term', sessionData.term_name);
//         console.log('✅ Academic session loaded:', sessionData.session_name, sessionData.term_name);
//       } else {
//         console.warn('No current academic session found or session fetch error:', sessionError);
//       }
//     } catch (error) {
//       console.error('Error loading current academic period:', error);
//       toast.error('Failed to load current academic period');
//     }
//   };

//   const loadUserBranch = async (userId: string) => {
//     setLoadingBranch(true);
//     try {
//       const { data: profile, error: profileError } = await supabase
//         .from('users')
//         .select('branch_id, metadata')
//         .eq('id', userId)
//         .single();

//       if (profileError) {
//         console.error('Profile fetch error:', profileError);
//         toast.error('Failed to load user profile');
//         setLoadingBranch(false);
//         return;
//       }

//       if (!profile?.branch_id) {
//         toast.error('No branch assigned to this user. Please contact administrator.');
//         setLoadingBranch(false);
//         return;
//       }

//       setBranchId(profile.branch_id);
      
//       if (profile.metadata && typeof profile.metadata === 'object') {
//         setBranchName(profile.metadata.branch || profile.metadata.branch_name || 'Unknown Branch');
//       }
      
//       await Promise.all([
//         loadClasses(profile.branch_id),
//         loadHouses(profile.branch_id)
//       ]);
      
//     } catch (error) {
//       console.error('Error loading user branch:', error);
//       toast.error('Failed to load user data');
//     } finally {
//       setLoadingBranch(false);
//     }
//   };

//   const loadClasses = async (branchId: string) => {
//     setLoadingClasses(true);
//     try {
//       const { data, error } = await supabase
//         .from('classes')
//         .select('id, name, code, level, department, class_code')
//         .eq('branch_id', branchId)
//         .eq('status', 'active')
//         .order('name');

//       if (error) throw error;

//       if (data && data.length > 0) {
//         const options = data.map(cls => ({
//           value: cls.id,
//           label: `${cls.name} (${cls.class_code || cls.code}) - ${cls.level || ''}`,
//           ...cls
//         }));
//         setClassOptions(options);
//         if (data.length === 1) {
//           setValue('class_id', data[0].id);
//           setValue('department', data[0].department || '');
//         }
//       } else {
//         toast.warning('No active classes found for this branch.');
//         setClassOptions([]);
//       }
//     } catch (error: any) {
//       console.error('Error fetching classes:', error);
//       toast.error(error.message || 'Failed to load classes');
//       setClassOptions([]);
//     } finally {
//       setLoadingClasses(false);
//     }
//   };

//   // Load houses from database (without color codes)
//   const loadHouses = async (branchId: string) => {
//     setLoadingHouses(true);
//     try {
//       const { data, error } = await supabase
//         .from('houses')
//         .select('id, name, motto')
//         .eq('branch_id', branchId)
//         .order('name');

//       if (error) throw error;

//       if (data && data.length > 0) {
//         const options = data.map(house => ({
//           value: house.id,
//           label: house.name,
//         }));
//         setHouseOptions(options);
//       } else {
//         // Fallback default houses if none in database
//         const defaultHouses = [
//           { value: 'red', label: 'Red House' },
//           { value: 'blue', label: 'Blue House' },
//           { value: 'green', label: 'Green House' },
//           { value: 'yellow', label: 'Yellow House' },
//         ];
//         setHouseOptions(defaultHouses);
//       }
//     } catch (error) {
//       console.error('Error fetching houses:', error);
//       // Fallback default houses
//       setHouseOptions([
//         { value: 'red', label: 'Red House' },
//         { value: 'blue', label: 'Blue House' },
//         { value: 'green', label: 'Green House' },
//         { value: 'yellow', label: 'Yellow House' },
//       ]);
//     } finally {
//       setLoadingHouses(false);
//     }
//   };

//   const loadImportHistory = async () => {
//     try {
//       const { data, error } = await supabase
//         .from('import_history')
//         .select('*')
//         .eq('branch_id', branchId)
//         .order('created_at', { ascending: false })
//         .limit(10);

//       if (error) throw error;
//       setImportHistory(data || []);
//     } catch (error) {
//       console.error('Error loading import history:', error);
//     }
//   };

//   // Get active session
//   const getActiveSession = async () => {
//     try {
//       const { data, error } = await supabase
//         .from('academic_sessions')
//         .select('id')
//         .eq('branch_id', branchId)
//         .eq('is_current', true)
//         .single();
      
//       if (error) {
//         console.error('Error fetching active session:', error);
//         const { data: latest, error: latestError } = await supabase
//           .from('academic_sessions')
//           .select('id')
//           .eq('branch_id', branchId)
//           .order('created_at', { ascending: false })
//           .limit(1)
//           .single();
        
//         if (latestError) {
//           console.error('No session found:', latestError);
//           return null;
//         }
//         return latest?.id || null;
//       }
//       return data?.id || null;
//     } catch (error) {
//       console.error('Error in getActiveSession:', error);
//       return null;
//     }
//   };

//   // Photo upload function
//   const uploadStudentPhoto = async (studentId: string, file: File) => {
//     try {
//       const fileExt = file.name.split('.').pop();
//       const fileName = `passport_${Date.now()}.${fileExt}`;
//       const filePath = `students/${studentId}/${fileName}`;
      
//       const { data, error } = await supabase.storage
//         .from('student-photos')
//         .upload(filePath, file, {
//           cacheControl: '3600',
//           upsert: true,
//         });
      
//       if (error) {
//         console.error('Storage upload error:', error);
//         throw error;
//       }
      
//       const { data: urlData } = supabase.storage
//         .from('student-photos')
//         .getPublicUrl(filePath);
      
//       const { error: updateError } = await supabase
//         .from('students')
//         .update({ passport_url: urlData.publicUrl })
//         .eq('id', studentId);
      
//       if (updateError) {
//         console.error('Update student photo error:', updateError);
//       }
      
//       return urlData.publicUrl;
//     } catch (error) {
//       console.error('Photo upload error:', error);
//       throw error;
//     }
//   };

//   // Handle photo change
//   const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (file) {
//       if (file.size > 2 * 1024 * 1024) {
//         toast.error('File size must be less than 2MB');
//         return;
//       }
      
//       if (!['image/jpeg', 'image/png', 'image/svg+xml'].includes(file.type)) {
//         toast.error('Please upload a JPG, PNG, or SVG image');
//         return;
//       }
      
//       setPhotoFile(file);
//       const reader = new FileReader();
//       reader.onload = () => {
//         setPhotoPreview(reader.result as string);
//       };
//       reader.readAsDataURL(file);
//     }
//   };

//   // OnSubmit
//   const onSubmit = async (data: StudentFormData) => {
//     const email = data.email?.trim();
    
//     if (!email) {
//       setError('email', { type: 'manual', message: 'Email is required' });
//       return;
//     }

//     try {
//       const exists = await checkEmailExists(email);
//       if (exists) {
//         setError('email', { 
//           type: 'manual', 
//           message: 'This email is already registered. Please use a different email.' 
//         });
//         toast.error('This email is already registered');
//         return;
//       }
//     } catch (error) {
//       console.error('Error checking email:', error);
//       toast.error('Error validating email. Please try again.');
//       return;
//     }

//     setIsSubmitting(true);
//     try {
//       console.log('📧 Registering with email:', email);

//       const sessionId = await getActiveSession();
//       if (!sessionId) {
//         toast('No active session found. Admission number will be generated without sequence.', {
//           icon: '⚠️'
//         });
//       }

//       // Prepare registration data
//       const registrationData = {
//         email: email,
//         password: data.password || '1234567',
//         generate_password_automatically: true,
        
//         // Personal Information
//         first_name: data.first_name?.trim() || '',
//         last_name: data.last_name?.trim() || '',
//         middle_name: data.middle_name?.trim() || '',
//         other_names: data.other_names?.trim() || '',
//         gender: data.gender || 'male',
//         date_of_birth: data.date_of_birth || dayjs().format('YYYY-MM-DD'),
//         place_of_birth: data.place_of_birth?.trim() || '',
//         nationality: data.nationality || 'Nigerian',
//         state_of_origin: data.state_of_origin?.trim() || '',
//         lga: data.lga?.trim() || '',
//         religion: data.religion || '',
//         blood_group: data.blood_group || '',
//         genotype: data.genotype || '',
        
//         // Contact Information
//         phone_number: data.phone_number?.trim() || '',
//         home_address: data.home_address?.trim() || 'No Address Provided',
//         residential_address: data.residential_address?.trim() || '',
//         country: data.country || 'Nigeria',
//         state: data.state?.trim() || '',
//         city: data.city?.trim() || '',
//         postal_code: data.postal_code?.trim() || '',
        
//         // Academic Information
//         academic_session: data.academic_session || currentSession || '2025/2026',
//         term: data.term || currentTerm || '1st Term',
//         admission_date: data.admission_date || dayjs().format('YYYY-MM-DD'),
//         department: data.department || '',
//         class_id: data.class_id || '',
//         class_arm: data.class_arm?.trim() || '',
//         roll_number: data.roll_number?.trim() || '',
//         house: data.house || '',
//         house_id: data.house_id || '',
//         school_bus: data.school_bus || '',
//         bus_route_id: data.bus_route_id || '',
//         hostel: data.hostel || '',
//         transportation_status: data.transportation_status || false,
//         pickup_location: data.pickup_location?.trim() || '',
//         previous_school: data.previous_school?.trim() || '',
//         previous_class: data.previous_class?.trim() || '',
//         student_status: data.student_status || 'active',
//         transfer_status: data.transfer_status || false,
        
//         // Parent/Guardian Information
//         father_name: data.father_name?.trim() || '',
//         father_phone: data.father_phone?.trim() || '',
//         father_email: data.father_email?.trim() || '',
//         father_occupation: data.father_occupation?.trim() || '',
//         mother_name: data.mother_name?.trim() || '',
//         mother_phone: data.mother_phone?.trim() || '',
//         mother_email: data.mother_email?.trim() || '',
//         mother_occupation: data.mother_occupation?.trim() || '',
//         guardian_name: data.guardian_name?.trim() || '',
//         guardian_phone: data.guardian_phone?.trim() || '',
//         guardian_email: data.guardian_email?.trim() || '',
//         guardian_address: data.guardian_address?.trim() || '',
//         guardian_relationship: data.guardian_relationship?.trim() || '',
//         emergency_contact_name: data.emergency_contact_name?.trim() || '',
//         emergency_contact_phone: data.emergency_contact_phone?.trim() || '',
//         parent_id: data.parent_id || '',
        
//         // Medical Information
//         doctor_name: data.doctor_name?.trim() || '',
//         hospital_name: data.hospital_name?.trim() || '',
//         doctor_phone: data.doctor_phone?.trim() || '',
//         medical_conditions: data.medical_conditions?.trim() || '',
//         allergies: data.allergies?.trim() || '',
//         special_needs: data.special_needs?.trim() || '',
//         medication: data.medication?.trim() || '',
//         health_notes: data.health_notes?.trim() || '',
//         medical_info: data.medical_info || '',
        
//         // Account Information
//         student_username: data.student_username?.trim() || email || '',
//         allow_student_login: true,
        
//         // Other Information
//         student_bio: data.student_bio?.trim() || '',
//         notes: data.notes?.trim() || '',
//         remarks: data.remarks?.trim() || '',
//         documents: data.documents || [],
//         qr_code_data: data.qr_code || '',
//         barcode_data: data.barcode || '',
        
//         // Branch and Session
//         branch_id: branchId,
//         session_id: sessionId,
//         role: 'student',
//       };

//       const cleanData = Object.fromEntries(
//         Object.entries(registrationData).filter(
//           ([_, value]) => value !== undefined && value !== null
//         )
//       );

//       console.log('📤 Sending registration data...');

//       const result = await studentService.registerStudent(cleanData);

//       if (!result.success) {
//         toast.error(result.message || 'Registration failed');
//         if (result.details) {
//           console.error('Error details:', result.details);
//         }
//         setIsSubmitting(false);
//         return;
//       }

//       if (photoFile && result.data?.auth_user_id) {
//         try {
//           const photoUrl = await uploadStudentPhoto(result.data.auth_user_id, photoFile);
//           if (photoUrl) {
//             toast.success('📸 Student photo uploaded successfully!');
//           }
//         } catch (photoError) {
//           console.error('Photo upload error:', photoError);
//           toast('Student registered but photo upload failed. You can upload later.', {
//             icon: '⚠️',
//           });
//         }
//       }

//       toast.success(
//         `✅ Student registered successfully!\n\n` +
//         `Name: ${result.data?.first_name || data.first_name || 'Student'} ${result.data?.last_name || data.last_name || 'User'}\n` +
//         `Admission: ${result.data?.admission_number}\n` +
//         `Student ID: ${result.data?.student_id}\n` +
//         `Email: ${result.data?.email}\n` +
//         `Password: ${result.data?.password}`,
//         { duration: 10000 }
//       );

//       if (data.allow_student_login && result.data) {
//         try {
//           const { error: signInError } = await supabase.auth.signInWithPassword({
//             email: result.data.email,
//             password: result.data.password,
//           });
//           if (!signInError) {
//             setTimeout(() => {
//               window.location.href = '/dashboard';
//             }, 2000);
//           }
//         } catch (error) {
//           console.error('Auto-login error:', error);
//         }
//       }

//       setPhotoFile(null);
//       setPhotoPreview(null);
//       reset({
//         ...data,
//         password: '1234567',
//         confirm_password: '1234567',
//       });

//     } catch (error: any) {
//       console.error('Error submitting form:', error);
//       toast.error(error.message || 'Failed to register student');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // ==================== BULK IMPORT FUNCTIONS ====================

//   const downloadTemplate = () => {
//     const template = [
//       {
//         'First Name': '',
//         'Middle Name': '',
//         'Last Name': '',
//         'Gender': 'male/female/other',
//         'Date of Birth': 'YYYY-MM-DD',
//         'Nationality': 'Nigerian',
//         'State of Origin': '',
//         'LGA': '',
//         'Religion': '',
//         'Blood Group': 'A+/A-/B+/B-/AB+/AB-/O+/O-',
//         'Genotype': 'AA/AS/AC/SS/SC',
//         'Email': '',
//         'Phone Number': '',
//         'Home Address': '',
//         'Class Name': '',
//         'Class Arm': '',
//         'Father Name': '',
//         'Father Phone': '',
//         'Mother Name': '',
//         'Mother Phone': '',
//         'Guardian Name': '',
//         'Guardian Phone': '',
//         'Emergency Contact Name': '',
//         'Emergency Contact Phone': '',
//         'Previous School': '',
//       }
//     ];

//     const wb = XLSX.utils.book_new();
//     const ws = XLSX.utils.json_to_sheet(template);
//     XLSX.utils.book_append_sheet(wb, ws, 'Students');
    
//     ws['!cols'] = [
//       { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
//       { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
//       { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
//       { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 15 },
//       { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
//       { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
//       { wch: 20 }
//     ];

//     const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
//     const blob = new Blob([wbout], { type: 'application/octet-stream' });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = `student_import_template_${dayjs().format('YYYY-MM-DD')}.xlsx`;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     URL.revokeObjectURL(url);
//     toast.success('Template downloaded successfully!');
//   };

//   const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
//     const uploadedFiles = Array.from(e.target.files || []);
//     if (uploadedFiles.length === 0) return;

//     const file = uploadedFiles[0];
//     const fileWithPreview = Object.assign(file, { preview: URL.createObjectURL(file) });
//     setFiles([fileWithPreview]);
//     await parseImportFile(file);
//   };

//   const parseImportFile = async (file: File) => {
//     try {
//       const reader = new FileReader();
//       reader.onload = async (e) => {
//         try {
//           const data = new Uint8Array(e.target?.result as ArrayBuffer);
//           const workbook = XLSX.read(data, { type: 'array' });
//           const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
//           const jsonData = XLSX.utils.sheet_to_json(firstSheet);

//           if (jsonData.length === 0) {
//             toast.error('No data found in the file');
//             return;
//           }

//           const records = jsonData.map((row: any, index) => {
//             const errors: string[] = [];
//             if (row['Email'] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row['Email'])) {
//               errors.push('Invalid email format');
//             }
//             return {
//               row: index + 2,
//               data: row,
//               errors,
//               status: errors.length === 0 ? 'valid' : 'invalid'
//             };
//           });

//           setImportRecords(records);
//           setShowPreview(true);
//           toast.success(`File parsed! ${records.length} records found.`);
//         } catch (error) {
//           console.error('Error parsing file:', error);
//           toast.error('Failed to parse file. Please check the format.');
//         }
//       };
//       reader.readAsArrayBuffer(file);
//     } catch (error) {
//       console.error('Error reading file:', error);
//       toast.error('Failed to read file');
//     }
//   };

//   const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
//     e.preventDefault();
//     setIsDragging(true);
//   };

//   const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
//     e.preventDefault();
//     setIsDragging(false);
//   };

//   const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
//     e.preventDefault();
//     setIsDragging(false);
//     const droppedFiles = Array.from(e.dataTransfer.files);
//     if (droppedFiles.length > 0) {
//       const file = droppedFiles[0];
//       const fileWithPreview = Object.assign(file, { preview: URL.createObjectURL(file) });
//       setFiles([fileWithPreview]);
//       parseImportFile(file);
//     }
//   };

//   const processImport = async () => {
//     const validRecords = importRecords.filter(r => r.status === 'valid');
//     if (validRecords.length === 0) {
//       toast.error('No valid records to import');
//       return;
//     }

//     setImporting(true);
//     let successCount = 0;
//     let errorCount = 0;

//     try {
//       for (const record of validRecords) {
//         try {
//           const data = record.data;
          
//           const email = data['Email']?.trim();
//           if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//             errorCount++;
//             continue;
//           }

//           const exists = await checkEmailExists(email);
//           if (exists) {
//             errorCount++;
//             continue;
//           }
          
//           let classId = null;
//           if (data['Class Name']) {
//             const { data: classData } = await supabase
//               .from('classes')
//               .select('id')
//               .eq('name', data['Class Name'])
//               .eq('branch_id', branchId)
//               .single();
//             if (classData) {
//               classId = classData.id;
//             }
//           }

//           const sessionId = await getActiveSession();

//           const registrationData = {
//             email: email,
//             first_name: data['First Name'] || 'Student',
//             last_name: data['Last Name'] || 'User',
//             middle_name: data['Middle Name'] || '',
//             gender: data['Gender']?.toLowerCase() || 'male',
//             date_of_birth: data['Date of Birth'] || dayjs().format('YYYY-MM-DD'),
//             nationality: data['Nationality'] || 'Nigerian',
//             state_of_origin: data['State of Origin'] || '',
//             lga: data['LGA'] || '',
//             religion: data['Religion'] || '',
//             blood_group: data['Blood Group'] || '',
//             genotype: data['Genotype'] || '',
//             phone_number: data['Phone Number'] || '',
//             home_address: data['Home Address'] || 'No Address Provided',
//             residential_address: data['Residential Address'] || '',
//             class_id: classId,
//             session_id: sessionId,
//             class_arm: data['Class Arm'] || '',
//             father_name: data['Father Name'] || '',
//             father_phone: data['Father Phone'] || '',
//             mother_name: data['Mother Name'] || '',
//             mother_phone: data['Mother Phone'] || '',
//             guardian_name: data['Guardian Name'] || '',
//             guardian_phone: data['Guardian Phone'] || '',
//             emergency_contact_name: data['Emergency Contact Name'] || '',
//             emergency_contact_phone: data['Emergency Contact Phone'] || '',
//             previous_school: data['Previous School'] || '',
//             branch_id: branchId,
//             role: 'student',
//             admission_date: dayjs().format('YYYY-MM-DD'),
//             academic_session: currentSession || '2025/2026',
//             term: currentTerm || '1st Term',
//             password: '1234567',
//             student_username: email || '',
//           };

//           const cleanData = Object.fromEntries(
//             Object.entries(registrationData).filter(
//               ([_, value]) => value !== undefined && value !== null
//             )
//           );

//           const result = await studentService.registerStudent(cleanData);

//           if (!result.success) {
//             throw new Error(result.message || 'Registration failed');
//           }

//           successCount++;
//         } catch (error) {
//           console.error('Error importing record:', error);
//           errorCount++;
//         }
//       }

//       await supabase
//         .from('import_history')
//         .insert([{
//           branch_id: branchId,
//           total_records: validRecords.length,
//           success_count: successCount,
//           error_count: errorCount,
//           file_name: files[0]?.name || 'Unknown',
//           created_by: authUserId,
//           created_at: new Date().toISOString(),
//           metadata: {
//             imported_by: user?.email || 'System',
//           }
//         }]);

//       toast.success(`Import complete! ${successCount} students added, ${errorCount} failed.`);
//       setShowPreview(false);
//       setImportRecords([]);
//       setFiles([]);
//       await loadImportHistory();
      
//     } catch (error) {
//       console.error('Error processing import:', error);
//       toast.error('Failed to process import');
//     } finally {
//       setImporting(false);
//     }
//   };

//   // Options
//   const genderOptions = [
//     { value: 'male', label: 'Male' },
//     { value: 'female', label: 'Female' },
//     { value: 'other', label: 'Other' },
//   ];

//   const bloodGroupOptions = [
//     { value: '', label: 'Select Blood Group' },
//     { value: 'A+', label: 'A+' },
//     { value: 'A-', label: 'A-' },
//     { value: 'B+', label: 'B+' },
//     { value: 'B-', label: 'B-' },
//     { value: 'AB+', label: 'AB+' },
//     { value: 'AB-', label: 'AB-' },
//     { value: 'O+', label: 'O+' },
//     { value: 'O-', label: 'O-' },
//   ];

//   const genotypeOptions = [
//     { value: '', label: 'Select Genotype' },
//     { value: 'AA', label: 'AA' },
//     { value: 'AS', label: 'AS' },
//     { value: 'AC', label: 'AC' },
//     { value: 'SS', label: 'SS' },
//     { value: 'SC', label: 'SC' },
//   ];

//   const statusOptions = [
//     { value: 'active', label: 'Active' },
//     { value: 'inactive', label: 'Inactive' },
//     { value: 'transferred', label: 'Transferred' },
//     { value: 'suspended', label: 'Suspended' },
//   ];

//   const departmentOptions = [
//     { value: '', label: 'Select Department' },
//     { value: 'science', label: 'Science' },
//     { value: 'commercial', label: 'Commercial' },
//     { value: 'arts', label: 'Arts' },
//     { value: 'primary', label: 'Primary' },
//     { value: 'nursery', label: 'Nursery' },
//     { value: 'creche', label: 'Creche' },
//   ];

//   if (loadingBranch) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
//       </div>
//     );
//   }

//   return (
//     <motion.div
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       transition={{ duration: 0.6 }}
//       className="max-w-7xl mx-auto p-8 space-y-8"
//     >
//       {/* Header */}
//       <motion.div
//         initial={{ opacity: 0, y: -20 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.5 }}
//         className="flex flex-col md:flex-row md:items-center justify-between gap-4"
//       >
//         <div>
//           <h1 className="text-4xl font-bold text-gray-900 dark:text-white bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
//             Student Registration
//           </h1>
//           <p className="text-gray-500 dark:text-gray-400 mt-1">
//             Register a new student into your school management system.
//           </p>
//         </div>
//         <button 
//           onClick={() => window.history.back()}
//           className="flex items-center gap-2 px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105 hover:shadow-md"
//         >
//           <ArrowLeft className="w-4 h-4" />
//           Back to Students
//         </button>
//       </motion.div>

//       {/* Main Layout */}
//       <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
//         {/* Left Column - Registration Form */}
//         <div className="lg:col-span-3 space-y-6">
//           <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
//             {/* Section 1: Personal Information */}
//             <SectionCard icon={User} title="Personal Information">
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                 <div className="lg:col-span-3">
//                   <div className="flex items-center gap-6">
//                     <div className="relative">
//                       <div 
//                         className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-all ${photoPreview ? 'p-1' : ''}`}
//                         onClick={() => document.getElementById('photo-upload')?.click()}
//                       >
//                         {photoPreview ? (
//                           <img 
//                             src={photoPreview} 
//                             alt="Student passport" 
//                             className="w-full h-full object-cover rounded-xl"
//                           />
//                         ) : (
//                           <Camera className="w-8 h-8 text-gray-400" />
//                         )}
//                       </div>
//                       <input
//                         id="photo-upload"
//                         type="file"
//                         accept="image/jpeg,image/png,image/svg+xml"
//                         className="hidden"
//                         onChange={handlePhotoChange}
//                       />
//                       {photoPreview && (
//                         <button 
//                           onClick={(e) => {
//                             e.stopPropagation();
//                             setPhotoFile(null);
//                             setPhotoPreview(null);
//                           }}
//                           className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-all"
//                         >
//                           <X className="w-3.5 h-3.5" />
//                         </button>
//                       )}
//                       <button 
//                         onClick={() => document.getElementById('photo-upload')?.click()}
//                         className="absolute -bottom-2 -right-2 p-1.5 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-all hover:scale-110"
//                       >
//                         <Upload className="w-3.5 h-3.5" />
//                       </button>
//                     </div>
//                     <div>
//                       <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Student Passport Upload</p>
//                       <p className="text-xs text-gray-400">JPG, PNG, SVG. Max 2MB</p>
//                       {photoFile && (
//                         <p className="text-xs text-green-500 mt-1">✓ {photoFile.name} selected</p>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//                 <FormInput
//                   label="First Name"
//                   icon={User}
//                   error={errors.first_name}
//                   {...register('first_name')}
//                 />
//                 <FormInput
//                   label="Middle Name"
//                   icon={User}
//                   {...register('middle_name')}
//                 />
//                 <FormInput
//                   label="Last Name"
//                   icon={User}
//                   error={errors.last_name}
//                   {...register('last_name')}
//                 />
//                 <FormInput
//                   label="Other Names"
//                   icon={User}
//                   {...register('other_names')}
//                 />
//                 <FormSelect
//                   label="Gender"
//                   icon={User}
//                   error={errors.gender}
//                   options={genderOptions}
//                   {...register('gender')}
//                 />
//                 <FormInput
//                   label="Date of Birth"
//                   icon={Calendar}
//                   type="date"
//                   error={errors.date_of_birth}
//                   {...register('date_of_birth')}
//                 />
//                 <FormInput
//                   label="Place of Birth"
//                   icon={MapPin}
//                   {...register('place_of_birth')}
//                 />
//                 <FormInput
//                   label="Nationality"
//                   icon={Globe}
//                   error={errors.nationality}
//                   {...register('nationality')}
//                 />
//                 <FormSelect
//                   label="State of Origin"
//                   icon={MapPin}
//                   options={stateOptions}
//                   {...register('state_of_origin')}
//                 />
//                 <FormSelect
//                   label="LGA"
//                   icon={MapPin}
//                   options={lgaOptions}
//                   disabled={!watchedStateOfOrigin}
//                   {...register('lga')}
//                 />
//                 <FormSelect
//                   label="Religion"
//                   options={[
//                     { value: '', label: 'Select Religion' },
//                     { value: 'christianity', label: 'Christianity' },
//                     { value: 'islam', label: 'Islam' },
//                     { value: 'traditional', label: 'Traditional' },
//                     { value: 'other', label: 'Other' },
//                     { value: 'none', label: 'None' },
//                   ]}
//                   {...register('religion')}
//                 />
//                 <FormSelect
//                   label="Blood Group"
//                   options={bloodGroupOptions}
//                   {...register('blood_group')}
//                 />
//                 <FormSelect
//                   label="Genotype"
//                   options={genotypeOptions}
//                   {...register('genotype')}
//                 />
//                 <FormInput
//                   label="Admission Number"
//                   icon={FileText}
//                   disabled
//                   className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
//                   {...register('admission_number')}
//                 />
//                 <FormInput
//                   label="Student ID"
//                   icon={FileText}
//                   disabled
//                   className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
//                   {...register('student_id')}
//                 />
//                 <div className="flex items-center gap-3">
//                   <QrCode className="w-5 h-5 text-gray-400" />
//                   <span className="text-sm text-gray-600 dark:text-gray-400">QR Code Preview (Optional)</span>
//                 </div>
//               </div>
//             </SectionCard>

//             {/* Section 2: Contact Information */}
//             <SectionCard icon={Mail} title="Contact Information">
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                 <FormInput
//                   label="Email"
//                   icon={Mail}
//                   type="email"
//                   placeholder="student@example.com"
//                   required
//                   autoComplete="email"
//                   error={errors.email}
//                   {...register('email')}
//                 />
//                 {isCheckingEmail && (
//                   <div className="text-sm text-blue-500 flex items-center gap-1">
//                     <Loader2 className="w-3 h-3 animate-spin" />
//                     Checking email availability...
//                   </div>
//                 )}
//                 <FormInput
//                   label="Phone Number"
//                   icon={Phone}
//                   {...register('phone_number')}
//                 />
//                 <FormInput
//                   label="Alternative Phone"
//                   icon={Phone}
//                   {...register('alternative_phone')}
//                 />
//                 <div className="md:col-span-2 lg:col-span-3">
//                   <FormTextarea
//                     label="Home Address"
//                     icon={MapPin}
//                     error={errors.home_address}
//                     rows={2}
//                     {...register('home_address')}
//                   />
//                 </div>
//                 <div className="md:col-span-2 lg:col-span-3">
//                   <FormTextarea
//                     label="Residential Address"
//                     icon={Home}
//                     rows={2}
//                     {...register('residential_address')}
//                   />
//                 </div>
//                 <FormInput
//                   label="Country"
//                   icon={Globe}
//                   {...register('country')}
//                 />
//                 <FormSelect
//                   label="State"
//                   icon={MapPin}
//                   options={stateOptions}
//                   {...register('state')}
//                 />
//                 <FormInput
//                   label="City"
//                   icon={Building}
//                   {...register('city')}
//                 />
//                 <FormInput
//                   label="Postal Code"
//                   {...register('postal_code')}
//                 />
//               </div>
//             </SectionCard>

//             {/* Section 3: Academic Information */}
//             <SectionCard icon={GraduationCap} title="Academic Information">
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                 <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center gap-3 col-span-full">
//                   <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
//                   <div>
//                     <p className="text-sm text-gray-700 dark:text-gray-300">
//                       Branch: <span className="font-semibold">{branchName || branchId || 'Loading...'}</span>
//                     </p>
//                     <p className="text-xs text-gray-500 dark:text-gray-400">Branch is automatically assigned from your profile</p>
//                   </div>
//                 </div>

//                 <FormSelect
//                   label="Academic Session"
//                   icon={Calendar}
//                   error={errors.academic_session}
//                   options={[
//                     { value: currentSession || '2025/2026', label: currentSession || '2025/2026' },
//                     { value: '2024/2025', label: '2024/2025' },
//                     { value: '2026/2027', label: '2026/2027' },
//                   ]}
//                   {...register('academic_session')}
//                 />
//                 <FormSelect
//                   label="Term"
//                   error={errors.term}
//                   options={[
//                     { value: currentTerm || '1st Term', label: currentTerm || '1st Term' },
//                     { value: '1st Term', label: '1st Term' },
//                     { value: '2nd Term', label: '2nd Term' },
//                     { value: '3rd Term', label: '3rd Term' },
//                   ]}
//                   {...register('term')}
//                 />
//                 <FormInput
//                   label="Admission Date"
//                   icon={Calendar}
//                   type="date"
//                   error={errors.admission_date}
//                   {...register('admission_date')}
//                 />
//                 <FormSelect
//                   label="Department"
//                   options={departmentOptions}
//                   {...register('department')}
//                 />
//                 <FormSelect
//                   label="Class"
//                   icon={GraduationCap}
//                   error={errors.class_id}
//                   options={classOptions}
//                   loading={loadingClasses}
//                   {...register('class_id')}
//                 />
//                 {classOptions.length === 0 && !loadingClasses && (
//                   <div className="text-sm text-yellow-600 dark:text-yellow-400 col-span-full">
//                     No active classes found for this branch. Please contact administrator.
//                   </div>
//                 )}
//                 <FormInput
//                   label="Class Arm"
//                   placeholder="A, B, C, etc."
//                   {...register('class_arm')}
//                 />
//                 <FormInput
//                   label="Roll Number"
//                   {...register('roll_number')}
//                 />
//                 <FormSelect
//                   label="House"
//                   options={houseOptions}
//                   loading={loadingHouses}
//                   {...register('house')}
//                 />
//                 <FormSelect
//                   label="School Bus"
//                   options={[
//                     { value: '', label: 'Select Bus' },
//                     { value: 'bus1', label: 'Bus 1 - Red' },
//                     { value: 'bus2', label: 'Bus 2 - Blue' },
//                     { value: 'bus3', label: 'Bus 3 - Yellow' },
//                     { value: 'none', label: 'None' },
//                   ]}
//                   {...register('school_bus')}
//                 />
//                 <FormSelect
//                   label="Hostel"
//                   options={[
//                     { value: '', label: 'Select Hostel' },
//                     { value: 'hostel1', label: 'Hostel A - Boys' },
//                     { value: 'hostel2', label: 'Hostel B - Girls' },
//                     { value: 'none', label: 'None' },
//                   ]}
//                   {...register('hostel')}
//                 />
//                 <FormInput
//                   label="Previous School"
//                   {...register('previous_school')}
//                 />
//                 <FormInput
//                   label="Previous Class"
//                   {...register('previous_class')}
//                 />
//                 <FormSelect
//                   label="Student Status"
//                   error={errors.student_status}
//                   options={statusOptions}
//                   {...register('student_status')}
//                 />
//               </div>
//             </SectionCard>

//             {/* Section 4: Parent/Guardian Information */}
//             <SectionCard icon={Users} title="Parent / Guardian">
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                 <div className="col-span-full">
//                   <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Father's Information</h3>
//                 </div>
//                 <FormInput label="Father's Name" {...register('father_name')} />
//                 <FormInput label="Father's Phone" icon={Phone} {...register('father_phone')} />
//                 <FormInput label="Father's Email" icon={Mail} type="email" {...register('father_email')} />
//                 <FormInput label="Father's Occupation" {...register('father_occupation')} />
                
//                 <div className="col-span-full">
//                   <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 mt-4">Mother's Information</h3>
//                 </div>
//                 <FormInput label="Mother's Name" {...register('mother_name')} />
//                 <FormInput label="Mother's Phone" icon={Phone} {...register('mother_phone')} />
//                 <FormInput label="Mother's Email" icon={Mail} type="email" {...register('mother_email')} />
//                 <FormInput label="Mother's Occupation" {...register('mother_occupation')} />
                
//                 <div className="col-span-full">
//                   <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 mt-4">Guardian Information</h3>
//                 </div>
//                 <FormInput label="Guardian's Name" {...register('guardian_name')} />
//                 <FormInput label="Guardian's Phone" icon={Phone} {...register('guardian_phone')} />
//                 <FormInput label="Guardian's Email" icon={Mail} type="email" {...register('guardian_email')} />
//                 <FormInput label="Guardian's Address" {...register('guardian_address')} />
//                 <FormInput label="Relationship" {...register('guardian_relationship')} />
                
//                 <div className="col-span-full">
//                   <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 mt-4">Emergency Contact</h3>
//                 </div>
//                 <FormInput label="Emergency Contact Name" {...register('emergency_contact_name')} />
//                 <FormInput label="Emergency Contact Phone" icon={Phone} {...register('emergency_contact_phone')} />
//               </div>
//             </SectionCard>

//             {/* Section 5: Medical Information */}
//             <SectionCard icon={Heart} title="Medical Information">
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//                 <FormInput label="Hospital" icon={Building} {...register('hospital_name')} />
//                 <FormInput label="Doctor" icon={Stethoscope} {...register('doctor_name')} />
//                 <FormInput label="Doctor's Phone" icon={Phone} {...register('doctor_phone')} />
//                 <FormSelect
//                   label="Blood Group"
//                   options={bloodGroupOptions}
//                   {...register('blood_group')}
//                 />
//                 <FormSelect
//                   label="Genotype"
//                   options={genotypeOptions}
//                   {...register('genotype')}
//                 />
//                 <div className="md:col-span-2 lg:col-span-3">
//                   <FormTextarea
//                     label="Medical Conditions"
//                     icon={AlertTriangle}
//                     rows={2}
//                     placeholder="List any medical conditions..."
//                     {...register('medical_conditions')}
//                   />
//                 </div>
//                 <div className="md:col-span-2 lg:col-span-3">
//                   <FormTextarea
//                     label="Allergies"
//                     icon={Pill}
//                     rows={2}
//                     placeholder="List any allergies..."
//                     {...register('allergies')}
//                   />
//                 </div>
//                 <div className="md:col-span-2 lg:col-span-3">
//                   <FormTextarea
//                     label="Special Needs"
//                     icon={HelpCircle}
//                     rows={2}
//                     placeholder="Any special needs..."
//                     {...register('special_needs')}
//                   />
//                 </div>
//                 <div className="md:col-span-2 lg:col-span-3">
//                   <FormTextarea
//                     label="Medication"
//                     icon={Pill}
//                     rows={2}
//                     placeholder="Current medications..."
//                     {...register('medication')}
//                   />
//                 </div>
//                 <div className="md:col-span-2 lg:col-span-3">
//                   <FormTextarea
//                     label="Health Notes"
//                     icon={Heart}
//                     rows={2}
//                     placeholder="Additional health notes..."
//                     {...register('health_notes')}
//                   />
//                 </div>
//               </div>
//             </SectionCard>

//             {/* Section 6: Account Information */}
//             <SectionCard icon={Lock} title="Account Information">
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <FormInput
//                   label="Student Username"
//                   icon={User}
//                   {...register('student_username')}
//                 />
//                 <FormInput
//                   label="Password"
//                   icon={Lock}
//                   type="password"
//                   defaultValue="1234567"
//                   {...register('password')}
//                 />
//                 <FormInput
//                   label="Confirm Password"
//                   icon={Lock}
//                   type="password"
//                   defaultValue="1234567"
//                   {...register('confirm_password')}
//                 />
//                 <div className="md:col-span-2 space-y-3">
//                   <label className="flex items-center gap-3 cursor-pointer">
//                     <input
//                       type="checkbox"
//                       className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-800"
//                       {...register('allow_student_login')}
//                     />
//                     <span className="text-sm text-gray-700 dark:text-gray-300">Allow student login</span>
//                   </label>
//                   <label className="flex items-center gap-3 cursor-pointer">
//                     <input
//                       type="checkbox"
//                       className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-800"
//                       {...register('generate_password_automatically')}
//                     />
//                     <span className="text-sm text-gray-700 dark:text-gray-300">Generate password automatically</span>
//                   </label>
//                 </div>
//               </div>
//             </SectionCard>

//             {/* Section 7: Other Information */}
//             <SectionCard icon={Notebook} title="Other Information">
//               <div className="grid grid-cols-1 gap-4">
//                 <FormTextarea
//                   label="Student Bio"
//                   rows={3}
//                   placeholder="Brief biography of the student..."
//                   {...register('student_bio')}
//                 />
//                 <FormTextarea
//                   label="Notes"
//                   rows={2}
//                   placeholder="Additional notes..."
//                   {...register('notes')}
//                 />
//                 <FormTextarea
//                   label="Remarks"
//                   rows={2}
//                   placeholder="Any remarks..."
//                   {...register('remarks')}
//                 />
//               </div>
//             </SectionCard>

//             {/* Info Notice */}
//             <motion.div
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: 0.5, delay: 0.3 }}
//               className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3"
//             >
//               <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
//               <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
//                 <p>• <strong>Email is required</strong> for login access.</p>
//                 <p>• All other fields are optional. Fill only what you have.</p>
//                 <p>• Admission Number and Student ID are generated automatically.</p>
//                 <p>• Branch is automatically assigned from your profile.</p>
//                 <p>• Default password is <strong>1234567</strong>.</p>
//                 <p>• Student username is auto-filled with the email address.</p>
//                 <p>• State of Origin auto-populates LGA options.</p>
//               </div>
//             </motion.div>

//             {/* Action Buttons */}
//             <motion.div
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               transition={{ duration: 0.5, delay: 0.4 }}
//               className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4"
//             >
//               <div className="flex items-center gap-3">
//                 <button
//                   type="button"
//                   onClick={() => {
//                     reset({
//                       ...watch(),
//                       password: '1234567',
//                       confirm_password: '1234567',
//                       allow_student_login: true,
//                       generate_password_automatically: true,
//                     });
//                     setPhotoFile(null);
//                     setPhotoPreview(null);
//                   }}
//                   className="flex items-center gap-2 px-6 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105 hover:shadow-md"
//                 >
//                   <RefreshCw className="w-4 h-4" />
//                   Reset
//                 </button>
//               </div>
//               <div className="flex items-center gap-3">
//                 <button
//                   type="submit"
//                   disabled={isSubmitting || loadingClasses || isCheckingEmail}
//                   className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   {isSubmitting ? (
//                     <>
//                       <Loader2 className="w-4 h-4 animate-spin" />
//                       Registering...
//                     </>
//                   ) : isCheckingEmail ? (
//                     <>
//                       <Loader2 className="w-4 h-4 animate-spin" />
//                       Validating...
//                     </>
//                   ) : (
//                     <>
//                       <User className="w-4 h-4" />
//                       Register Student
//                     </>
//                   )}
//                 </button>
//                 <button
//                   type="button"
//                   className="flex items-center gap-2 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 hover:scale-105 hover:shadow-md"
//                 >
//                   <PlusCircle className="w-4 h-4" />
//                   Register & Add Another
//                 </button>
//               </div>
//             </motion.div>
//           </form>
//         </div>

//         {/* Right Column - Bulk Import Card */}
//         <div className="lg:col-span-1">
//           <motion.div
//             initial={{ opacity: 0, x: 20 }}
//             animate={{ opacity: 1, x: 0 }}
//             transition={{ duration: 0.6, delay: 0.2 }}
//             className="sticky top-8"
//           >
//             <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
//               <div className="flex items-center gap-3 mb-4">
//                 <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
//                   <Upload className="w-5 h-5" />
//                 </div>
//                 <div>
//                   <h3 className="font-semibold">Bulk Import Students</h3>
//                   <p className="text-xs text-white/80">Import thousands from Excel or CSV</p>
//                 </div>
//               </div>

//               {/* Upload Zone */}
//               <div
//                 className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
//                   isDragging
//                     ? 'border-white bg-white/20 scale-105'
//                     : 'border-white/30 hover:border-white/60'
//                 }`}
//                 onDragOver={handleDragOver}
//                 onDragLeave={handleDragLeave}
//                 onDrop={handleDrop}
//               >
//                 <motion.div
//                   animate={isDragging ? { scale: 1.05 } : { scale: 1 }}
//                   transition={{ duration: 0.2 }}
//                 >
//                   <CloudUpload className="w-12 h-12 mx-auto mb-3 text-white/60" />
//                   <p className="text-sm font-medium mb-1">Drag & Drop your file here</p>
//                   <p className="text-xs text-white/60 mb-3">or</p>
//                   <label className="cursor-pointer">
//                     <span className="inline-block px-4 py-2 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30 transition-all hover:scale-105">
//                       Choose File
//                     </span>
//                     <input
//                       type="file"
//                       ref={fileInputRef}
//                       className="hidden"
//                       accept=".csv,.xlsx,.xls"
//                       onChange={handleFileUpload}
//                     />
//                   </label>
//                   <p className="text-xs text-white/50 mt-2">Accepts .csv, .xlsx, .xls</p>
//                 </motion.div>
//               </div>

//               {/* Upload Progress */}
//               {uploadProgress > 0 && uploadProgress < 100 && (
//                 <div className="mt-4">
//                   <div className="bg-white/20 rounded-full h-2 overflow-hidden">
//                     <motion.div
//                       className="bg-white h-full rounded-full"
//                       initial={{ width: 0 }}
//                       animate={{ width: `${uploadProgress}%` }}
//                       transition={{ duration: 0.5 }}
//                     />
//                   </div>
//                   <p className="text-xs text-white/60 mt-1">{uploadProgress}% uploaded</p>
//                 </div>
//               )}

//               {/* Action Buttons */}
//               <div className="mt-4 space-y-2">
//                 <button 
//                   onClick={downloadTemplate}
//                   className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-all hover:scale-105"
//                 >
//                   <Download className="w-4 h-4" />
//                   Download Template
//                 </button>
//                 <button 
//                   onClick={() => setShowPreview(true)}
//                   disabled={importRecords.length === 0}
//                   className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   <Eye className="w-4 h-4" />
//                   Preview Import ({importRecords.length})
//                 </button>
//                 <button 
//                   onClick={() => setShowHistory(!showHistory)}
//                   className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-all hover:scale-105"
//                 >
//                   <History className="w-4 h-4" />
//                   Import History ({importHistory.length})
//                 </button>
//               </div>
//             </div>

//             {/* Import Features */}
//             <motion.div
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               transition={{ duration: 0.5, delay: 0.4 }}
//               className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6"
//             >
//               <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Import Features</h4>
//               <div className="grid grid-cols-2 gap-2">
//                 {[
//                   'CSV',
//                   'Excel',
//                   'Duplicate Detection',
//                   'Validation',
//                   'Preview',
//                   'Batch Import',
//                   'Rollback',
//                   'Progress',
//                   'Error Report',
//                   'Success Report',
//                 ].map((feature) => (
//                   <div key={feature} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
//                     <Check className="w-3 h-3 text-green-500" />
//                     {feature}
//                   </div>
//                 ))}
//               </div>
//             </motion.div>

//             {/* Import Instructions */}
//             <motion.div
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               transition={{ duration: 0.5, delay: 0.5 }}
//               className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6"
//             >
//               <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Import Instructions</h4>
//               <ol className="space-y-2 text-xs text-gray-600 dark:text-gray-400 list-decimal list-inside">
//                 <li>Download Template</li>
//                 <li>Fill Student Records</li>
//                 <li>Save Excel File</li>
//                 <li>Upload File</li>
//                 <li>Preview Records</li>
//                 <li>Import Students</li>
//               </ol>
//             </motion.div>
//           </motion.div>
//         </div>
//       </div>

//       {/* Preview Modal */}
//       <AnimatePresence>
//         {showPreview && importRecords.length > 0 && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
//             onClick={() => setShowPreview(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.9, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.9, opacity: 0 }}
//               className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
//               onClick={(e) => e.stopPropagation()}
//             >
//               <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
//                 <div>
//                   <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Import Preview</h3>
//                   <p className="text-sm text-gray-500 dark:text-gray-400">
//                     {importRecords.filter(r => r.status === 'valid').length} valid records found
//                   </p>
//                 </div>
//                 <button
//                   onClick={() => setShowPreview(false)}
//                   className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>
              
//               <div className="flex-1 overflow-y-auto p-4">
//                 <div className="space-y-2">
//                   {importRecords.map((record) => (
//                     <div
//                       key={record.row}
//                       className={`p-3 rounded-lg border ${
//                         record.status === 'valid' 
//                           ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
//                           : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
//                       }`}
//                     >
//                       <div className="flex items-start justify-between">
//                         <div className="flex-1">
//                           <div className="flex items-center gap-2">
//                             <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
//                               Row {record.row}
//                             </span>
//                             <span className={`text-xs font-medium ${
//                               record.status === 'valid' 
//                                 ? 'text-green-600 dark:text-green-400' 
//                                 : 'text-red-600 dark:text-red-400'
//                             }`}>
//                               {record.status === 'valid' ? '✓ Valid' : '✗ Invalid'}
//                             </span>
//                           </div>
//                           <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
//                             {record.data['First Name'] || 'No name'} {record.data['Last Name'] || ''}
//                             {record.data['Class Name'] && ` - ${record.data['Class Name']}`}
//                           </div>
//                           {record.errors.length > 0 && (
//                             <div className="mt-1 text-xs text-red-500">
//                               {record.errors.join(', ')}
//                             </div>
//                           )}
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>

//               <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
//                 <button
//                   onClick={() => setShowPreview(false)}
//                   className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
//                 >
//                   Close
//                 </button>
//                 <button
//                   onClick={processImport}
//                   disabled={importing || importRecords.filter(r => r.status === 'valid').length === 0}
//                   className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   {importing ? (
//                     <>
//                       <Loader2 className="w-4 h-4 animate-spin" />
//                       Importing...
//                     </>
//                   ) : (
//                     <>
//                       <Upload className="w-4 h-4" />
//                       Import {importRecords.filter(r => r.status === 'valid').length} Records
//                     </>
//                   )}
//                 </button>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>

//       {/* Import History Modal */}
//       <AnimatePresence>
//         {showHistory && (
//           <motion.div
//             initial={{ opacity: 0 }}
//             animate={{ opacity: 1 }}
//             exit={{ opacity: 0 }}
//             className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
//             onClick={() => setShowHistory(false)}
//           >
//             <motion.div
//               initial={{ scale: 0.9, opacity: 0 }}
//               animate={{ scale: 1, opacity: 1 }}
//               exit={{ scale: 0.9, opacity: 0 }}
//               className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
//               onClick={(e) => e.stopPropagation()}
//             >
//               <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
//                 <div>
//                   <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Import History</h3>
//                   <p className="text-sm text-gray-500 dark:text-gray-400">
//                     Last 10 imports
//                   </p>
//                 </div>
//                 <button
//                   onClick={() => setShowHistory(false)}
//                   className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
//                 >
//                   <X className="w-5 h-5" />
//                 </button>
//               </div>
              
//               <div className="flex-1 overflow-y-auto p-4">
//                 {importHistory.length === 0 ? (
//                   <div className="text-center py-8 text-gray-500 dark:text-gray-400">
//                     <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
//                     <p>No import history found</p>
//                   </div>
//                 ) : (
//                   <div className="space-y-3">
//                     {importHistory.map((item: any) => (
//                       <div
//                         key={item.id}
//                         className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700"
//                       >
//                         <div className="flex items-start justify-between">
//                           <div>
//                             <p className="font-medium text-gray-900 dark:text-white">{item.file_name}</p>
//                             <p className="text-sm text-gray-500 dark:text-gray-400">
//                               {dayjs(item.created_at).format('MMMM D, YYYY h:mm A')}
//                             </p>
//                           </div>
//                           <div className="text-right">
//                             <div className="flex items-center gap-3">
//                               <span className="text-sm text-green-600 dark:text-green-400">
//                                 ✓ {item.success_count}
//                               </span>
//                               {item.error_count > 0 && (
//                                 <span className="text-sm text-red-600 dark:text-red-400">
//                                   ✗ {item.error_count}
//                                 </span>
//                               )}
//                             </div>
//                             <p className="text-xs text-gray-500 dark:text-gray-400">
//                               Total: {item.total_records}
//                             </p>
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               <div className="flex items-center justify-end p-4 border-t border-gray-200 dark:border-gray-700">
//                 <button
//                   onClick={() => setShowHistory(false)}
//                   className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
//                 >
//                   Close
//                 </button>
//               </div>
//             </motion.div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </motion.div>
//   );
// };

// export default StudentRegistrationForm;


import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../config/supabase/client';
import { useAuth } from '../../../hooks/useAuth';
import { studentService } from '../../../services/api/student.service';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import {
  User,
  Mail,
  GraduationCap,
  Users,
  Heart,
  Lock,
  Notebook,
  Upload,
  ArrowLeft,
  Download,
  Eye,
  History,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  Save,
  FileText,
  QrCode,
  Building,
  Phone,
  MapPin,
  Calendar,
  Globe,
  Home,
  Stethoscope,
  Pill,
  AlertTriangle,
  HelpCircle,
  Info,
  CloudUpload,
  Check,
  Loader2,
  Camera,
  X
} from 'lucide-react';

// Types
type StudentFormData = z.infer<typeof studentSchema>;

// Nigerian States and LGAs Data
const nigerianStates: { [key: string]: string[] } = {
  'Abia': ['Aba North', 'Aba South', 'Arochukwu', 'Bende', 'Ikwuano', 'Isiala Ngwa North', 'Isiala Ngwa South', 'Isuikwuato', 'Obi Ngwa', 'Ohafia', 'Osisioma', 'Ugwunagbo', 'Ukwa East', 'Ukwa West', 'Umuahia North', 'Umuahia South', 'Umu Nneochi'],
  'Adamawa': ['Demsa', 'Fufure', 'Ganye', 'Girei', 'Gombi', 'Guyuk', 'Hong', 'Jada', 'Lamurde', 'Madagali', 'Maiha', 'Mayo Belwa', 'Michika', 'Mubi North', 'Mubi South', 'Numan', 'Shelleng', 'Song', 'Toungo', 'Yola North', 'Yola South'],
  'Akwa Ibom': ['Abak', 'Eastern Obolo', 'Eket', 'Esit Eket', 'Essien Udim', 'Etim Ekpo', 'Etinan', 'Ibeno', 'Ibesikpo Asutan', 'Ibiono Ibom', 'Ika', 'Ikono', 'Ikot Abasi', 'Ikot Ekpene', 'Ini', 'Itu', 'Mbo', 'Mkpat Enin', 'Nsit Atai', 'Nsit Ibom', 'Nsit Ubium', 'Obot Akara', 'Okobo', 'Onna', 'Oron', 'Oruk Anam', 'Udung Uko', 'Ukanafun', 'Uruan', 'Urue Offong/Oruko', 'Uyo'],
  'Anambra': ['Aguata', 'Anambra East', 'Anambra West', 'Anaocha', 'Awka North', 'Awka South', 'Ayamelum', 'Dunukofia', 'Ekwusigo', 'Idemili North', 'Idemili South', 'Ihiala', 'Njikoka', 'Nnewi North', 'Nnewi South', 'Ogbaru', 'Onitsha North', 'Onitsha South', 'Orumba North', 'Orumba South', 'Oyi'],
  'Bauchi': ['Alkaleri', 'Bauchi', 'Bogoro', 'Damban', 'Darazo', 'Dass', 'Gamawa', 'Ganjuwa', 'Giade', 'Itas/Gadau', 'Jama\'are', 'Katagum', 'Kirfi', 'Misau', 'Ningi', 'Shira', 'Tafawa Balewa', 'Toro', 'Warji', 'Zaki'],
  'Bayelsa': ['Brass', 'Ekeremor', 'Kolokuma/Opokuma', 'Nembe', 'Ogbia', 'Sagbama', 'Southern Ijaw', 'Yenagoa'],
  'Benue': ['Ado', 'Agatu', 'Apa', 'Buruku', 'Gboko', 'Guma', 'Gwer East', 'Gwer West', 'Katsina-Ala', 'Konshisha', 'Kwande', 'Logo', 'Makurdi', 'Obi', 'Ogbadibo', 'Ohimini', 'Oju', 'Okpokwu', 'Oturkpo', 'Tarka', 'Ukum', 'Ushongo', 'Vandeikya'],
  'Borno': ['Abadam', 'Askira/Uba', 'Bama', 'Bayo', 'Biu', 'Chibok', 'Damboa', 'Dikwa', 'Gubio', 'Guzamala', 'Gwoza', 'Hawul', 'Jere', 'Kaga', 'Kala/Balge', 'Konduga', 'Kukawa', 'Kwaya Kusar', 'Mafa', 'Magumeri', 'Maiduguri', 'Marte', 'Mobbar', 'Monguno', 'Ngala', 'Nganzai', 'Shani'],
  'Cross River': ['Abi', 'Akamkpa', 'Akpabuyo', 'Bakassi', 'Bekwarra', 'Biase', 'Boki', 'Calabar Municipal', 'Calabar South', 'Etung', 'Ikom', 'Obanliku', 'Obubra', 'Obudu', 'Odukpani', 'Ogoja', 'Yakuur', 'Yala'],
  'Delta': ['Aniocha North', 'Aniocha South', 'Bomadi', 'Burutu', 'Ethiope East', 'Ethiope West', 'Ika North East', 'Ika South', 'Isoko North', 'Isoko South', 'Ndokwa East', 'Ndokwa West', 'Okpe', 'Oshimili North', 'Oshimili South', 'Patani', 'Sapele', 'Udu', 'Ughelli North', 'Ughelli South', 'Ukwuani', 'Uvwie', 'Warri North', 'Warri South', 'Warri South West'],
  'Ebonyi': ['Abakaliki', 'Afikpo North', 'Afikpo South', 'Ebonyi', 'Ezza North', 'Ezza South', 'Ikwo', 'Ishielu', 'Ivo', 'Izzi', 'Ohaozara', 'Ohaukwu', 'Onicha'],
  'Edo': ['Akoko-Edo', 'Egor', 'Esan Central', 'Esan North-East', 'Esan South-East', 'Esan West', 'Etsako Central', 'Etsako East', 'Etsako West', 'Igueben', 'Ikpoba-Okha', 'Oredo', 'Orhionmwon', 'Ovia North-East', 'Ovia South-West', 'Owan East', 'Owan West', 'Uhunmwonde'],
  'Ekiti': ['Ado Ekiti', 'Efon', 'Ekiti East', 'Ekiti South-West', 'Ekiti West', 'Emure', 'Gbonyin', 'Ido Osi', 'Ijero', 'Ikere', 'Ikole', 'Ilejemeje', 'Irepodun/Ifelodun', 'Ise/Orun', 'Moba', 'Oye'],
  'Enugu': ['Aninri', 'Awgu', 'Enugu East', 'Enugu North', 'Enugu South', 'Ezeagu', 'Igbo Etiti', 'Igbo Eze North', 'Igbo Eze South', 'Isi Uzo', 'Nkanu East', 'Nkanu West', 'Nsukka', 'Oji River', 'Udenu', 'Udi', 'Uzo Uwani'],
  'FCT': ['Abaji', 'Bwari', 'Gwagwalada', 'Kuje', 'Kwali', 'Municipal Area Council'],
  'Gombe': ['Akko', 'Balanga', 'Billiri', 'Dukku', 'Funakaye', 'Gombe', 'Kaltungo', 'Kwami', 'Nafada', 'Shongom', 'Yamaltu/Deba'],
  'Imo': ['Aboh Mbaise', 'Ahiazu Mbaise', 'Ehime Mbano', 'Ezinihitte', 'Ideato North', 'Ideato South', 'Ihitte/Uboma', 'Ikeduru', 'Isiala Mbano', 'Isu', 'Mbaitoli', 'Ngor Okpala', 'Njaba', 'Nkwerre', 'Nwangele', 'Obowo', 'Oguta', 'Ohaji/Egbema', 'Okigwe', 'Onuimo', 'Orlu', 'Orsu', 'Oru East', 'Oru West', 'Owerri Municipal', 'Owerri North', 'Owerri West', 'Unuimo'],
  'Jigawa': ['Auyo', 'Babura', 'Biriniwa', 'Birnin Kudu', 'Buji', 'Dutse', 'Gagarawa', 'Garki', 'Gumel', 'Guri', 'Gwaram', 'Gwiwa', 'Hadejia', 'Jahun', 'Kafin Hausa', 'Kaugama', 'Kazaure', 'Kiri Kasama', 'Kiyawa', 'Kaugama', 'Maigatari', 'Malam Madori', 'Miga', 'Ringim', 'Roni', 'Sule Tankarkar', 'Taura', 'Yankwashi'],
  'Kaduna': ['Birnin Gwari', 'Chikun', 'Giwa', 'Igabi', 'Ikara', 'Jaba', 'Jema\'a', 'Kachia', 'Kaduna North', 'Kaduna South', 'Kagarko', 'Kajuru', 'Kaura', 'Kauru', 'Kubau', 'Kudan', 'Lere', 'Makarfi', 'Sabon Gari', 'Sanga', 'Soba', 'Zangon Kataf', 'Zaria'],
  'Kano': ['Ajingi', 'Albasu', 'Bagwai', 'Bebeji', 'Bichi', 'Bunkure', 'Dala', 'Dambatta', 'Dawakin Kudu', 'Dawakin Tofa', 'Doguwa', 'Fagge', 'Gabasawa', 'Garko', 'Garun Mallam', 'Gaya', 'Gezawa', 'Gwale', 'Gwarzo', 'Kabo', 'Kano Municipal', 'Karaye', 'Kibiya', 'Kiru', 'Kumbotso', 'Kunchi', 'Kura', 'Madobi', 'Makoda', 'Minjibir', 'Nasarawa', 'Rano', 'Rimin Gado', 'Rogo', 'Shanono', 'Sumaila', 'Takai', 'Tarauni', 'Tofa', 'Tsanyawa', 'Tudun Wada', 'Ungogo', 'Warawa', 'Wudil'],
  'Katsina': ['Bakori', 'Batagarawa', 'Batsari', 'Baure', 'Bindawa', 'Charanchi', 'Dandume', 'Danja', 'Dan Musa', 'Daura', 'Dutsi', 'Dutsin Ma', 'Faskari', 'Funtua', 'Ingawa', 'Jibia', 'Kafur', 'Kaita', 'Kankara', 'Kankia', 'Katsina', 'Kurfi', 'Kusada', 'Mai\'Adua', 'Malumfashi', 'Mani', 'Mashi', 'Matazu', 'Musawa', 'Rimi', 'Sabuwa', 'Safana', 'Sandamu', 'Zango'],
  'Kebbi': ['Aleiro', 'Arewa Dandi', 'Argungu', 'Augie', 'Bagudo', 'Birnin Kebbi', 'Bunza', 'Dandi', 'Fakai', 'Gwandu', 'Jega', 'Kalgo', 'Koko/Besse', 'Maiyama', 'Ngaski', 'Sakaba', 'Shanga', 'Suru', 'Wasagu/Danko', 'Yauri', 'Zuru'],
  'Kogi': ['Adavi', 'Ajaokuta', 'Ankpa', 'Bassa', 'Dekina', 'Ibaji', 'Idah', 'Igalamela Odolu', 'Ijumu', 'Kabba/Bunu', 'Kogi', 'Lokoja', 'Mopa Muro', 'Ofu', 'Ogori/Magongo', 'Okehi', 'Okene', 'Olamaboro', 'Omala', 'Yagba East', 'Yagba West'],
  'Kwara': ['Asa', 'Baruten', 'Edu', 'Ekiti', 'Ifelodun', 'Ilorin East', 'Ilorin South', 'Ilorin West', 'Irepodun', 'Isin', 'Kaiama', 'Moro', 'Offa', 'Oke Ero', 'Oyun', 'Pategi'],
  'Lagos': ['Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa', 'Badagry', 'Epe', 'Eti Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye', 'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland', 'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'],
  'Nasarawa': ['Akwanga', 'Awe', 'Doma', 'Karu', 'Keana', 'Keffi', 'Kokona', 'Lafia', 'Nasarawa', 'Nasarawa Egon', 'Obi', 'Toto', 'Wamba'],
  'Niger': ['Agaie', 'Agwara', 'Bida', 'Borgu', 'Bosso', 'Chanchaga', 'Edati', 'Gbako', 'Gurara', 'Katcha', 'Kontagora', 'Lapai', 'Lavun', 'Magama', 'Mariga', 'Mashegu', 'Mokwa', 'Moya', 'Paikoro', 'Rafi', 'Rijau', 'Shiroro', 'Suleja', 'Tafa', 'Wushishi'],
  'Ogun': ['Abeokuta North', 'Abeokuta South', 'Ado-Odo/Ota', 'Egbado North', 'Egbado South', 'Ewekoro', 'Ifo', 'Ijebu East', 'Ijebu North', 'Ijebu North East', 'Ijebu Ode', 'Ikenne', 'Imeko Afon', 'Ipokia', 'Obafemi Owode', 'Odeda', 'Odogbolu', 'Ogun Waterside', 'Remo North', 'Shagamu'],
  'Ondo': ['Akoko North-East', 'Akoko North-West', 'Akoko South-East', 'Akoko South-West', 'Akure North', 'Akure South', 'Ese Odo', 'Idanre', 'Ifedore', 'Ilaje', 'Ile Oluji/Okeigbo', 'Irele', 'Odigbo', 'Okitipupa', 'Ondo East', 'Ondo West', 'Ose', 'Owo'],
  'Osun': ['Atakunmosa East', 'Atakunmosa West', 'Aiyedaade', 'Aiyedire', 'Boluwaduro', 'Boripe', 'Ede North', 'Ede South', 'Egbedore', 'Ejigbo', 'Ife Central', 'Ife East', 'Ife North', 'Ife South', 'Ila', 'Ilesa East', 'Ilesa West', 'Irepodun', 'Irewole', 'Isokan', 'Iwo', 'Obokun', 'Odo Otin', 'Ola Oluwa', 'Olorunda', 'Oriade', 'Orolu', 'Osogbo'],
  'Oyo': ['Afijio', 'Akinyele', 'Atiba', 'Atisbo', 'Egbeda', 'Ibadan North', 'Ibadan North-East', 'Ibadan North-West', 'Ibadan South-East', 'Ibadan South-West', 'Ibarapa Central', 'Ibarapa East', 'Ibarapa North', 'Ido', 'Irepo', 'Iseyin', 'Itesiwaju', 'Iwajowa', 'Kajola', 'Lagelu', 'Ogbomosho North', 'Ogbomosho South', 'Ogo Oluwa', 'Olorunsogo', 'Oluyole', 'Ona Ara', 'Orelope', 'Ori Ire', 'Oyo', 'Oyo East', 'Saki East', 'Saki West', 'Surulere'],
  'Plateau': ['Barkin Ladi', 'Bassa', 'Bokkos', 'Jos East', 'Jos North', 'Jos South', 'Kanam', 'Kanke', 'Langtang North', 'Langtang South', 'Mangu', 'Mikang', 'Pankshin', 'Qua\'an Pan', 'Riyom', 'Shendam', 'Wase'],
  'Rivers': ['Abua/Odual', 'Ahoada East', 'Ahoada West', 'Akuku-Toru', 'Andoni', 'Asari-Toru', 'Bonny', 'Degema', 'Eleme', 'Emuoha', 'Etche', 'Gokana', 'Ikwerre', 'Khana', 'Obio/Akpor', 'Ogba/Egbema/Ndoni', 'Ogu/Bolo', 'Okrika', 'Omuma', 'Opobo/Nkoro', 'Oyigbo', 'Port Harcourt', 'Tai'],
  'Sokoto': ['Binji', 'Bodinga', 'Dange Shuni', 'Gada', 'Goronyo', 'Gudu', 'Gwadabawa', 'Illela', 'Isa', 'Kebbe', 'Kware', 'Rabah', 'Sabon Birni', 'Shagari', 'Silame', 'Sokoto North', 'Sokoto South', 'Tambuwal', 'Tangaza', 'Tureta', 'Wamako', 'Wurno', 'Yabo'],
  'Taraba': ['Ardo Kola', 'Bali', 'Donga', 'Gashaka', 'Gassol', 'Ibi', 'Jalingo', 'Karim Lamido', 'Kumi', 'Lau', 'Sardauna', 'Takum', 'Ussa', 'Wukari', 'Yorro', 'Zing'],
  'Yobe': ['Bade', 'Bursari', 'Damaturu', 'Fika', 'Fune', 'Geidam', 'Gujba', 'Gulani', 'Jakusko', 'Karasuwa', 'Machina', 'Nangere', 'Nguru', 'Potiskum', 'Tarmuwa', 'Yunusari', 'Yusufari'],
  'Zamfara': ['Anka', 'Bakura', 'Birnin Magaji/Kiyaw', 'Bukkuyum', 'Bungudu', 'Gummi', 'Gusau', 'Kaura Namoda', 'Maradun', 'Maru', 'Shinkafi', 'Talata Mafara', 'Chafe', 'Zurmi']
};

// Form Components
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ElementType;
  error?: { message?: string };
  required?: boolean;
}

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  icon?: React.ElementType;
  error?: { message?: string };
  options: Array<{ value: string; label: string }>;
  loading?: boolean;
  required?: boolean;
}

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  icon?: React.ElementType;
  error?: { message?: string };
  required?: boolean;
}

// Zod Schema
const studentSchema = z.object({
  first_name: z.string().optional(),
  middle_name: z.string().optional(),
  last_name: z.string().optional(),
  other_names: z.string().optional(),
  gender: z.string().optional(),
  date_of_birth: z.string().optional(),
  place_of_birth: z.string().optional(),
  nationality: z.string().optional(),
  state_of_origin: z.string().optional(),
  lga: z.string().optional(),
  religion: z.string().optional(),
  blood_group: z.string().optional(),
  genotype: z.string().optional(),
  admission_number: z.string().optional(),
  student_id: z.string().optional(),
  qr_code: z.string().optional(),
  passport_photo: z.string().optional(),

  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  
  phone_number: z.string().optional(),
  alternative_phone: z.string().optional(),
  home_address: z.string().optional(),
  residential_address: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),

  academic_session: z.string().optional(),
  term: z.string().optional(),
  admission_date: z.string().optional(),
  department: z.string().optional(),
  class_id: z.string().optional(),
  class_arm: z.string().optional(),
  roll_number: z.string().optional(),
  house: z.string().optional(),
  house_id: z.string().optional(),
  school_bus: z.string().optional(),
  bus_route_id: z.string().optional(),
  hostel: z.string().optional(),
  transportation_status: z.boolean().default(false),
  pickup_location: z.string().optional(),
  previous_school: z.string().optional(),
  previous_class: z.string().optional(),
  student_status: z.string().default('active'),
  transfer_status: z.boolean().default(false),

  father_name: z.string().optional(),
  father_phone: z.string().optional(),
  father_email: z.string().optional(),
  father_occupation: z.string().optional(),
  mother_name: z.string().optional(),
  mother_phone: z.string().optional(),
  mother_email: z.string().optional(),
  mother_occupation: z.string().optional(),
  guardian_name: z.string().optional(),
  guardian_phone: z.string().optional(),
  guardian_email: z.string().optional(),
  guardian_address: z.string().optional(),
  guardian_relationship: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),

  doctor_name: z.string().optional(),
  hospital_name: z.string().optional(),
  doctor_phone: z.string().optional(),
  medical_conditions: z.string().optional(),
  allergies: z.string().optional(),
  special_needs: z.string().optional(),
  medication: z.string().optional(),
  health_notes: z.string().optional(),
  medical_info: z.string().optional(),

  student_username: z.string().optional(),
  password: z.string().optional(),
  confirm_password: z.string().optional(),
  allow_student_login: z.boolean().default(false),
  generate_password_automatically: z.boolean().default(false),

  student_bio: z.string().optional(),
  notes: z.string().optional(),
  remarks: z.string().optional(),
  documents: z.array(z.string()).optional(),
  parent_id: z.string().optional(),
  club_id: z.string().optional(),
  barcode: z.string().optional(),
});

// FormInput Component - Mobile Responsive
const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, icon: Icon, error, required = false, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
          {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />}
          <span className="truncate">{label}</span>
          {required && <span className="text-red-500 flex-shrink-0">*</span>}
        </label>
        <input
          ref={ref}
          className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200 ${error ? 'border-red-500 ring-2 ring-red-200' : ''} ${className}`}
          {...props}
        />
        <AnimatePresence>
          {error?.message && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-xs sm:text-sm text-red-500 flex items-center gap-1"
            >
              <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
              <span className="break-words">{error.message}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
FormInput.displayName = 'FormInput';

// FormSelect Component - Mobile Responsive
const FormSelect = React.forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, icon: Icon, error, options, loading = false, required = false, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
          {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />}
          <span className="truncate">{label}</span>
          {required && <span className="text-red-500 flex-shrink-0">*</span>}
        </label>
        <select
          ref={ref}
          className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200 ${error ? 'border-red-500 ring-2 ring-red-200' : ''} ${className}`}
          {...props}
          disabled={loading}
        >
          <option value="">Select {label}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <AnimatePresence>
          {error?.message && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-xs sm:text-sm text-red-500 flex items-center gap-1"
            >
              <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
              <span className="break-words">{error.message}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
FormSelect.displayName = 'FormSelect';

// FormTextarea Component - Mobile Responsive
const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, icon: Icon, error, required = false, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        <label className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
          {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />}
          <span className="truncate">{label}</span>
          {required && <span className="text-red-500 flex-shrink-0">*</span>}
        </label>
        <textarea
          ref={ref}
          className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200 ${error ? 'border-red-500 ring-2 ring-red-200' : ''} ${className}`}
          {...props}
        />
        <AnimatePresence>
          {error?.message && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-xs sm:text-sm text-red-500 flex items-center gap-1"
            >
              <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" />
              <span className="break-words">{error.message}</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);
FormTextarea.displayName = 'FormTextarea';

// Section Card Component - Mobile Responsive
interface SectionCardProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
}

const SectionCard: React.FC<SectionCardProps> = ({ 
  icon: Icon, 
  title, 
  children, 
  className = '' 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 ${className}`}
    >
      <div className="p-3 sm:p-4 md:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg sm:rounded-xl text-white flex-shrink-0">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">{title}</h2>
        </div>
        <div className="space-y-4 sm:space-y-6">{children}</div>
      </div>
    </motion.div>
  );
};

// Email existence check
const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const { data: studentData } = await supabase
      .from('students')
      .select('email')
      .eq('email', email.trim())
      .maybeSingle();

    if (studentData) return true;

    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('email', email.trim())
      .maybeSingle();

    if (userData) return true;

    return false;
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
};

// Main Component
const StudentRegistrationForm: React.FC = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [files, setFiles] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [branchId, setBranchId] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');
  const [classOptions, setClassOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [houseOptions, setHouseOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);
  const [loadingHouses, setLoadingHouses] = useState<boolean>(false);
  const [loadingBranch, setLoadingBranch] = useState<boolean>(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState<boolean>(false);
  const [currentSession, setCurrentSession] = useState<string>('');
  const [currentTerm, setCurrentTerm] = useState<string>('');
  
  // State and LGA options
  const stateOptions = Object.keys(nigerianStates).map(state => ({
    value: state,
    label: state
  }));
  
  const [lgaOptions, setLgaOptions] = useState<Array<{ value: string; label: string }>>([]);
  
  // Photo states
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Import states
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [importRecords, setImportRecords] = useState<any[]>([]);
  const [importing, setImporting] = useState<boolean>(false);
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // useForm
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    reset,
    formState: { errors },
  } = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      nationality: 'Nigerian',
      student_status: 'active',
      allow_student_login: true,
      generate_password_automatically: true,
      admission_date: dayjs().format('YYYY-MM-DD'),
      academic_session: '',
      term: '',
      gender: 'male',
      transportation_status: false,
      transfer_status: false,
      password: '1234567',
      confirm_password: '1234567',
      country: 'Nigeria',
    },
    mode: 'all',
    reValidateMode: 'onChange',
  });

  const watchedClassId = watch('class_id');
  const watchedEmail = watch('email', '');
  const watchedPassword = watch('password', '1234567');
  const watchedStateOfOrigin = watch('state_of_origin', '');

  // Auto-fill student username with FULL email
  useEffect(() => {
    if (watchedEmail) {
      setValue('student_username', watchedEmail);
    }
  }, [watchedEmail, setValue]);

  // Update LGA options when state changes
  useEffect(() => {
    if (watchedStateOfOrigin && nigerianStates[watchedStateOfOrigin]) {
      const lgas = nigerianStates[watchedStateOfOrigin].map(lga => ({
        value: lga,
        label: lga
      }));
      setLgaOptions(lgas);
    } else {
      setLgaOptions([]);
    }
  }, [watchedStateOfOrigin]);

  // Ensure password stays as default
  useEffect(() => {
    if (!watchedPassword || watchedPassword === '') {
      setValue('password', '1234567');
      setValue('confirm_password', '1234567');
    }
  }, [watchedPassword, setValue]);

  // Email validation effect
  useEffect(() => {
    if (emailTimeoutRef.current) {
      clearTimeout(emailTimeoutRef.current);
    }

    const email = watchedEmail?.trim();
    
    if (!email) {
      clearErrors('email');
      return;
    }

    const isValidFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isValidFormat) {
      return;
    }

    setIsCheckingEmail(true);
    emailTimeoutRef.current = setTimeout(async () => {
      try {
        const exists = await checkEmailExists(email);
        if (exists) {
          setError('email', { 
            type: 'manual', 
            message: 'This email is already registered. Please use a different email.' 
          });
        } else {
          clearErrors('email');
        }
      } catch (error) {
        console.error('Error checking email:', error);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500);

    return () => {
      if (emailTimeoutRef.current) {
        clearTimeout(emailTimeoutRef.current);
      }
    };
  }, [watchedEmail, setError, clearErrors]);

  // Get authenticated user
  useEffect(() => {
    const getAuthUser = async () => {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error getting auth user:', error);
        toast.error('Please login to continue');
        setLoadingBranch(false);
        return;
      }
      if (authUser) {
        setAuthUserId(authUser.id);
        await loadUserBranch(authUser.id);
        await loadImportHistory();
        await loadCurrentAcademicPeriod();
      } else {
        toast.error('Please login to continue');
        setLoadingBranch(false);
      }
    };
    getAuthUser();
  }, []);

  // When class changes, auto-fill department
  useEffect(() => {
    if (watchedClassId && classOptions.length > 0) {
      const selected = classOptions.find(c => c.value === watchedClassId);
      if (selected) {
        const dept = selected.label.split(' - ')[1] || '';
        setValue('department', dept);
      }
    }
  }, [watchedClassId, classOptions, setValue]);

  // Load current academic period
  const loadCurrentAcademicPeriod = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('academic_sessions')
        .select('session_name, term_name')
        .eq('is_current', true)
        .limit(1)
        .single();

      if (!sessionError && sessionData) {
        setCurrentSession(sessionData.session_name);
        setCurrentTerm(sessionData.term_name);
        setValue('academic_session', sessionData.session_name);
        setValue('term', sessionData.term_name);
        console.log('✅ Academic session loaded:', sessionData.session_name, sessionData.term_name);
      } else {
        console.warn('No current academic session found or session fetch error:', sessionError);
      }
    } catch (error) {
      console.error('Error loading current academic period:', error);
      toast.error('Failed to load current academic period');
    }
  };

  const loadUserBranch = async (userId: string) => {
    setLoadingBranch(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('branch_id, metadata')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        toast.error('Failed to load user profile');
        setLoadingBranch(false);
        return;
      }

      if (!profile?.branch_id) {
        toast.error('No branch assigned to this user. Please contact administrator.');
        setLoadingBranch(false);
        return;
      }

      setBranchId(profile.branch_id);
      
      if (profile.metadata && typeof profile.metadata === 'object') {
        setBranchName(profile.metadata.branch || profile.metadata.branch_name || 'Unknown Branch');
      }
      
      await Promise.all([
        loadClasses(profile.branch_id),
        loadHouses(profile.branch_id)
      ]);
      
    } catch (error) {
      console.error('Error loading user branch:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoadingBranch(false);
    }
  };

  const loadClasses = async (branchId: string) => {
    setLoadingClasses(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, code, level, department, class_code')
        .eq('branch_id', branchId)
        .eq('status', 'active')
        .order('name');

      if (error) throw error;

      if (data && data.length > 0) {
        const options = data.map(cls => ({
          value: cls.id,
          label: `${cls.name} (${cls.class_code || cls.code}) - ${cls.level || ''}`,
          ...cls
        }));
        setClassOptions(options);
        if (data.length === 1) {
          setValue('class_id', data[0].id);
          setValue('department', data[0].department || '');
        }
      } else {
        toast.warning('No active classes found for this branch.');
        setClassOptions([]);
      }
    } catch (error: any) {
      console.error('Error fetching classes:', error);
      toast.error(error.message || 'Failed to load classes');
      setClassOptions([]);
    } finally {
      setLoadingClasses(false);
    }
  };

  // Load houses from database (without color codes)
  const loadHouses = async (branchId: string) => {
    setLoadingHouses(true);
    try {
      const { data, error } = await supabase
        .from('houses')
        .select('id, name, motto')
        .eq('branch_id', branchId)
        .order('name');

      if (error) throw error;

      if (data && data.length > 0) {
        const options = data.map(house => ({
          value: house.id,
          label: house.name,
        }));
        setHouseOptions(options);
      } else {
        // Fallback default houses if none in database
        const defaultHouses = [
          { value: 'red', label: 'Red House' },
          { value: 'blue', label: 'Blue House' },
          { value: 'green', label: 'Green House' },
          { value: 'yellow', label: 'Yellow House' },
        ];
        setHouseOptions(defaultHouses);
      }
    } catch (error) {
      console.error('Error fetching houses:', error);
      // Fallback default houses
      setHouseOptions([
        { value: 'red', label: 'Red House' },
        { value: 'blue', label: 'Blue House' },
        { value: 'green', label: 'Green House' },
        { value: 'yellow', label: 'Yellow House' },
      ]);
    } finally {
      setLoadingHouses(false);
    }
  };

  const loadImportHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('import_history')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setImportHistory(data || []);
    } catch (error) {
      console.error('Error loading import history:', error);
    }
  };

  // Get active session
  const getActiveSession = async () => {
    try {
      const { data, error } = await supabase
        .from('academic_sessions')
        .select('id')
        .eq('branch_id', branchId)
        .eq('is_current', true)
        .single();
      
      if (error) {
        console.error('Error fetching active session:', error);
        const { data: latest, error: latestError } = await supabase
          .from('academic_sessions')
          .select('id')
          .eq('branch_id', branchId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (latestError) {
          console.error('No session found:', latestError);
          return null;
        }
        return latest?.id || null;
      }
      return data?.id || null;
    } catch (error) {
      console.error('Error in getActiveSession:', error);
      return null;
    }
  };

  // Photo upload function
  const uploadStudentPhoto = async (studentId: string, file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `passport_${Date.now()}.${fileExt}`;
      const filePath = `students/${studentId}/${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('student-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });
      
      if (error) {
        console.error('Storage upload error:', error);
        throw error;
      }
      
      const { data: urlData } = supabase.storage
        .from('student-photos')
        .getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from('students')
        .update({ passport_url: urlData.publicUrl })
        .eq('id', studentId);
      
      if (updateError) {
        console.error('Update student photo error:', updateError);
      }
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Photo upload error:', error);
      throw error;
    }
  };

  // Handle photo change
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        return;
      }
      
      if (!['image/jpeg', 'image/png', 'image/svg+xml'].includes(file.type)) {
        toast.error('Please upload a JPG, PNG, or SVG image');
        return;
      }
      
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // OnSubmit
  const onSubmit = async (data: StudentFormData) => {
    const email = data.email?.trim();
    
    if (!email) {
      setError('email', { type: 'manual', message: 'Email is required' });
      return;
    }

    try {
      const exists = await checkEmailExists(email);
      if (exists) {
        setError('email', { 
          type: 'manual', 
          message: 'This email is already registered. Please use a different email.' 
        });
        toast.error('This email is already registered');
        return;
      }
    } catch (error) {
      console.error('Error checking email:', error);
      toast.error('Error validating email. Please try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('📧 Registering with email:', email);

      const sessionId = await getActiveSession();
      if (!sessionId) {
        toast('No active session found. Admission number will be generated without sequence.', {
          icon: '⚠️'
        });
      }

      // Prepare registration data
      const registrationData = {
        email: email,
        password: data.password || '1234567',
        generate_password_automatically: true,
        
        // Personal Information
        first_name: data.first_name?.trim() || '',
        last_name: data.last_name?.trim() || '',
        middle_name: data.middle_name?.trim() || '',
        other_names: data.other_names?.trim() || '',
        gender: data.gender || 'male',
        date_of_birth: data.date_of_birth || dayjs().format('YYYY-MM-DD'),
        place_of_birth: data.place_of_birth?.trim() || '',
        nationality: data.nationality || 'Nigerian',
        state_of_origin: data.state_of_origin?.trim() || '',
        lga: data.lga?.trim() || '',
        religion: data.religion || '',
        blood_group: data.blood_group || '',
        genotype: data.genotype || '',
        
        // Contact Information
        phone_number: data.phone_number?.trim() || '',
        home_address: data.home_address?.trim() || 'No Address Provided',
        residential_address: data.residential_address?.trim() || '',
        country: data.country || 'Nigeria',
        state: data.state?.trim() || '',
        city: data.city?.trim() || '',
        postal_code: data.postal_code?.trim() || '',
        
        // Academic Information
        academic_session: data.academic_session || currentSession || '2025/2026',
        term: data.term || currentTerm || '1st Term',
        admission_date: data.admission_date || dayjs().format('YYYY-MM-DD'),
        department: data.department || '',
        class_id: data.class_id || '',
        class_arm: data.class_arm?.trim() || '',
        roll_number: data.roll_number?.trim() || '',
        house: data.house || '',
        house_id: data.house_id || '',
        school_bus: data.school_bus || '',
        bus_route_id: data.bus_route_id || '',
        hostel: data.hostel || '',
        transportation_status: data.transportation_status || false,
        pickup_location: data.pickup_location?.trim() || '',
        previous_school: data.previous_school?.trim() || '',
        previous_class: data.previous_class?.trim() || '',
        student_status: data.student_status || 'active',
        transfer_status: data.transfer_status || false,
        
        // Parent/Guardian Information
        father_name: data.father_name?.trim() || '',
        father_phone: data.father_phone?.trim() || '',
        father_email: data.father_email?.trim() || '',
        father_occupation: data.father_occupation?.trim() || '',
        mother_name: data.mother_name?.trim() || '',
        mother_phone: data.mother_phone?.trim() || '',
        mother_email: data.mother_email?.trim() || '',
        mother_occupation: data.mother_occupation?.trim() || '',
        guardian_name: data.guardian_name?.trim() || '',
        guardian_phone: data.guardian_phone?.trim() || '',
        guardian_email: data.guardian_email?.trim() || '',
        guardian_address: data.guardian_address?.trim() || '',
        guardian_relationship: data.guardian_relationship?.trim() || '',
        emergency_contact_name: data.emergency_contact_name?.trim() || '',
        emergency_contact_phone: data.emergency_contact_phone?.trim() || '',
        parent_id: data.parent_id || '',
        
        // Medical Information
        doctor_name: data.doctor_name?.trim() || '',
        hospital_name: data.hospital_name?.trim() || '',
        doctor_phone: data.doctor_phone?.trim() || '',
        medical_conditions: data.medical_conditions?.trim() || '',
        allergies: data.allergies?.trim() || '',
        special_needs: data.special_needs?.trim() || '',
        medication: data.medication?.trim() || '',
        health_notes: data.health_notes?.trim() || '',
        medical_info: data.medical_info || '',
        
        // Account Information
        student_username: data.student_username?.trim() || email || '',
        allow_student_login: true,
        
        // Other Information
        student_bio: data.student_bio?.trim() || '',
        notes: data.notes?.trim() || '',
        remarks: data.remarks?.trim() || '',
        documents: data.documents || [],
        qr_code_data: data.qr_code || '',
        barcode_data: data.barcode || '',
        
        // Branch and Session
        branch_id: branchId,
        session_id: sessionId,
        role: 'student',
      };

      const cleanData = Object.fromEntries(
        Object.entries(registrationData).filter(
          ([_, value]) => value !== undefined && value !== null
        )
      );

      console.log('📤 Sending registration data...');

      const result = await studentService.registerStudent(cleanData);

      if (!result.success) {
        toast.error(result.message || 'Registration failed');
        if (result.details) {
          console.error('Error details:', result.details);
        }
        setIsSubmitting(false);
        return;
      }

      if (photoFile && result.data?.auth_user_id) {
        try {
          const photoUrl = await uploadStudentPhoto(result.data.auth_user_id, photoFile);
          if (photoUrl) {
            toast.success('📸 Student photo uploaded successfully!');
          }
        } catch (photoError) {
          console.error('Photo upload error:', photoError);
          toast('Student registered but photo upload failed. You can upload later.', {
            icon: '⚠️',
          });
        }
      }

      toast.success(
        `✅ Student registered successfully!\n\n` +
        `Name: ${result.data?.first_name || data.first_name || 'Student'} ${result.data?.last_name || data.last_name || 'User'}\n` +
        `Admission: ${result.data?.admission_number}\n` +
        `Student ID: ${result.data?.student_id}\n` +
        `Email: ${result.data?.email}\n` +
        `Password: ${result.data?.password}`,
        { duration: 10000 }
      );

      if (data.allow_student_login && result.data) {
        try {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: result.data.email,
            password: result.data.password,
          });
          if (!signInError) {
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 2000);
          }
        } catch (error) {
          console.error('Auto-login error:', error);
        }
      }

      setPhotoFile(null);
      setPhotoPreview(null);
      reset({
        ...data,
        password: '1234567',
        confirm_password: '1234567',
      });

    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast.error(error.message || 'Failed to register student');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==================== BULK IMPORT FUNCTIONS ====================

  const downloadTemplate = () => {
    const template = [
      {
        'First Name': '',
        'Middle Name': '',
        'Last Name': '',
        'Gender': 'male/female/other',
        'Date of Birth': 'YYYY-MM-DD',
        'Nationality': 'Nigerian',
        'State of Origin': '',
        'LGA': '',
        'Religion': '',
        'Blood Group': 'A+/A-/B+/B-/AB+/AB-/O+/O-',
        'Genotype': 'AA/AS/AC/SS/SC',
        'Email': '',
        'Phone Number': '',
        'Home Address': '',
        'Class Name': '',
        'Class Arm': '',
        'Father Name': '',
        'Father Phone': '',
        'Mother Name': '',
        'Mother Phone': '',
        'Guardian Name': '',
        'Guardian Phone': '',
        'Emergency Contact Name': '',
        'Emergency Contact Phone': '',
        'Previous School': '',
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(template);
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    
    ws['!cols'] = [
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
      { wch: 20 }
    ];

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student_import_template_${dayjs().format('YYYY-MM-DD')}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Template downloaded successfully!');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files || []);
    if (uploadedFiles.length === 0) return;

    const file = uploadedFiles[0];
    const fileWithPreview = Object.assign(file, { preview: URL.createObjectURL(file) });
    setFiles([fileWithPreview]);
    await parseImportFile(file);
  };

  const parseImportFile = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);

          if (jsonData.length === 0) {
            toast.error('No data found in the file');
            return;
          }

          const records = jsonData.map((row: any, index) => {
            const errors: string[] = [];
            if (row['Email'] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row['Email'])) {
              errors.push('Invalid email format');
            }
            return {
              row: index + 2,
              data: row,
              errors,
              status: errors.length === 0 ? 'valid' : 'invalid'
            };
          });

          setImportRecords(records);
          setShowPreview(true);
          toast.success(`File parsed! ${records.length} records found.`);
        } catch (error) {
          console.error('Error parsing file:', error);
          toast.error('Failed to parse file. Please check the format.');
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Failed to read file');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      const file = droppedFiles[0];
      const fileWithPreview = Object.assign(file, { preview: URL.createObjectURL(file) });
      setFiles([fileWithPreview]);
      parseImportFile(file);
    }
  };

  const processImport = async () => {
    const validRecords = importRecords.filter(r => r.status === 'valid');
    if (validRecords.length === 0) {
      toast.error('No valid records to import');
      return;
    }

    setImporting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const record of validRecords) {
        try {
          const data = record.data;
          
          const email = data['Email']?.trim();
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errorCount++;
            continue;
          }

          const exists = await checkEmailExists(email);
          if (exists) {
            errorCount++;
            continue;
          }
          
          let classId = null;
          if (data['Class Name']) {
            const { data: classData } = await supabase
              .from('classes')
              .select('id')
              .eq('name', data['Class Name'])
              .eq('branch_id', branchId)
              .single();
            if (classData) {
              classId = classData.id;
            }
          }

          const sessionId = await getActiveSession();

          const registrationData = {
            email: email,
            first_name: data['First Name'] || 'Student',
            last_name: data['Last Name'] || 'User',
            middle_name: data['Middle Name'] || '',
            gender: data['Gender']?.toLowerCase() || 'male',
            date_of_birth: data['Date of Birth'] || dayjs().format('YYYY-MM-DD'),
            nationality: data['Nationality'] || 'Nigerian',
            state_of_origin: data['State of Origin'] || '',
            lga: data['LGA'] || '',
            religion: data['Religion'] || '',
            blood_group: data['Blood Group'] || '',
            genotype: data['Genotype'] || '',
            phone_number: data['Phone Number'] || '',
            home_address: data['Home Address'] || 'No Address Provided',
            residential_address: data['Residential Address'] || '',
            class_id: classId,
            session_id: sessionId,
            class_arm: data['Class Arm'] || '',
            father_name: data['Father Name'] || '',
            father_phone: data['Father Phone'] || '',
            mother_name: data['Mother Name'] || '',
            mother_phone: data['Mother Phone'] || '',
            guardian_name: data['Guardian Name'] || '',
            guardian_phone: data['Guardian Phone'] || '',
            emergency_contact_name: data['Emergency Contact Name'] || '',
            emergency_contact_phone: data['Emergency Contact Phone'] || '',
            previous_school: data['Previous School'] || '',
            branch_id: branchId,
            role: 'student',
            admission_date: dayjs().format('YYYY-MM-DD'),
            academic_session: currentSession || '2025/2026',
            term: currentTerm || '1st Term',
            password: '1234567',
            student_username: email || '',
          };

          const cleanData = Object.fromEntries(
            Object.entries(registrationData).filter(
              ([_, value]) => value !== undefined && value !== null
            )
          );

          const result = await studentService.registerStudent(cleanData);

          if (!result.success) {
            throw new Error(result.message || 'Registration failed');
          }

          successCount++;
        } catch (error) {
          console.error('Error importing record:', error);
          errorCount++;
        }
      }

      await supabase
        .from('import_history')
        .insert([{
          branch_id: branchId,
          total_records: validRecords.length,
          success_count: successCount,
          error_count: errorCount,
          file_name: files[0]?.name || 'Unknown',
          created_by: authUserId,
          created_at: new Date().toISOString(),
          metadata: {
            imported_by: user?.email || 'System',
          }
        }]);

      toast.success(`Import complete! ${successCount} students added, ${errorCount} failed.`);
      setShowPreview(false);
      setImportRecords([]);
      setFiles([]);
      await loadImportHistory();
      
    } catch (error) {
      console.error('Error processing import:', error);
      toast.error('Failed to process import');
    } finally {
      setImporting(false);
    }
  };

  // Options
  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];

  const bloodGroupOptions = [
    { value: '', label: 'Select Blood Group' },
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
  ];

  const genotypeOptions = [
    { value: '', label: 'Select Genotype' },
    { value: 'AA', label: 'AA' },
    { value: 'AS', label: 'AS' },
    { value: 'AC', label: 'AC' },
    { value: 'SS', label: 'SS' },
    { value: 'SC', label: 'SC' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'transferred', label: 'Transferred' },
    { value: 'suspended', label: 'Suspended' },
  ];

  const departmentOptions = [
    { value: '', label: 'Select Department' },
    { value: 'science', label: 'Science' },
    { value: 'commercial', label: 'Commercial' },
    { value: 'arts', label: 'Arts' },
    { value: 'primary', label: 'Primary' },
    { value: 'nursery', label: 'Nursery' },
    { value: 'creche', label: 'Creche' },
  ];

  if (loadingBranch) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="max-w-7xl mx-auto p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6 md:space-y-8"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
            Student Registration
          </h1>
          <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-1">
            Register a new student into your school management system.
          </p>
        </div>
        <button 
          onClick={() => window.history.back()}
          className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105 hover:shadow-md text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden xs:inline">Back to Students</span>
          <span className="xs:hidden">Back</span>
        </button>
      </motion.div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
        {/* Left Column - Registration Form */}
        <div className="lg:col-span-3 space-y-4 sm:space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
            {/* Section 1: Personal Information */}
            <SectionCard icon={User} title="Personal Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="sm:col-span-2 lg:col-span-3">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                    <div className="relative flex-shrink-0">
                      <div 
                        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-all ${photoPreview ? 'p-1' : ''}`}
                        onClick={() => document.getElementById('photo-upload')?.click()}
                      >
                        {photoPreview ? (
                          <img 
                            src={photoPreview} 
                            alt="Student passport" 
                            className="w-full h-full object-cover rounded-xl"
                          />
                        ) : (
                          <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                        )}
                      </div>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/svg+xml"
                        className="hidden"
                        onChange={handlePhotoChange}
                      />
                      {photoPreview && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhotoFile(null);
                            setPhotoPreview(null);
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      <button 
                        onClick={() => document.getElementById('photo-upload')?.click()}
                        className="absolute -bottom-2 -right-2 p-1.5 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-all hover:scale-110"
                      >
                        <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </div>
                    <div className="text-center sm:text-left">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Student Passport Upload</p>
                      <p className="text-xs text-gray-400">JPG, PNG, SVG. Max 2MB</p>
                      {photoFile && (
                        <p className="text-xs text-green-500 mt-1">✓ {photoFile.name} selected</p>
                      )}
                    </div>
                  </div>
                </div>
                <FormInput
                  label="First Name"
                  icon={User}
                  error={errors.first_name}
                  {...register('first_name')}
                />
                <FormInput
                  label="Middle Name"
                  icon={User}
                  {...register('middle_name')}
                />
                <FormInput
                  label="Last Name"
                  icon={User}
                  error={errors.last_name}
                  {...register('last_name')}
                />
                <FormInput
                  label="Other Names"
                  icon={User}
                  {...register('other_names')}
                />
                <FormSelect
                  label="Gender"
                  icon={User}
                  error={errors.gender}
                  options={genderOptions}
                  {...register('gender')}
                />
                <FormInput
                  label="Date of Birth"
                  icon={Calendar}
                  type="date"
                  error={errors.date_of_birth}
                  {...register('date_of_birth')}
                />
                <FormInput
                  label="Place of Birth"
                  icon={MapPin}
                  {...register('place_of_birth')}
                />
                <FormInput
                  label="Nationality"
                  icon={Globe}
                  error={errors.nationality}
                  {...register('nationality')}
                />
                <FormSelect
                  label="State of Origin"
                  icon={MapPin}
                  options={stateOptions}
                  {...register('state_of_origin')}
                />
                <FormSelect
                  label="LGA"
                  icon={MapPin}
                  options={lgaOptions}
                  disabled={!watchedStateOfOrigin}
                  {...register('lga')}
                />
                <FormSelect
                  label="Religion"
                  options={[
                    { value: '', label: 'Select Religion' },
                    { value: 'christianity', label: 'Christianity' },
                    { value: 'islam', label: 'Islam' },
                    { value: 'traditional', label: 'Traditional' },
                    { value: 'other', label: 'Other' },
                    { value: 'none', label: 'None' },
                  ]}
                  {...register('religion')}
                />
                <FormSelect
                  label="Blood Group"
                  options={bloodGroupOptions}
                  {...register('blood_group')}
                />
                <FormSelect
                  label="Genotype"
                  options={genotypeOptions}
                  {...register('genotype')}
                />
                <FormInput
                  label="Admission Number"
                  icon={FileText}
                  disabled
                  className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                  {...register('admission_number')}
                />
                <FormInput
                  label="Student ID"
                  icon={FileText}
                  disabled
                  className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
                  {...register('student_id')}
                />
                <div className="flex items-center gap-3">
                  <QrCode className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">QR Code Preview (Optional)</span>
                </div>
              </div>
            </SectionCard>

            {/* Section 2: Contact Information */}
            <SectionCard icon={Mail} title="Contact Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <FormInput
                  label="Email"
                  icon={Mail}
                  type="email"
                  placeholder="student@example.com"
                  required
                  autoComplete="email"
                  error={errors.email}
                  {...register('email')}
                />
                {isCheckingEmail && (
                  <div className="text-sm text-blue-500 flex items-center gap-1 col-span-full">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Checking email availability...
                  </div>
                )}
                <FormInput
                  label="Phone Number"
                  icon={Phone}
                  {...register('phone_number')}
                />
                <FormInput
                  label="Alternative Phone"
                  icon={Phone}
                  {...register('alternative_phone')}
                />
                <div className="sm:col-span-2 lg:col-span-3">
                  <FormTextarea
                    label="Home Address"
                    icon={MapPin}
                    error={errors.home_address}
                    rows={2}
                    {...register('home_address')}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <FormTextarea
                    label="Residential Address"
                    icon={Home}
                    rows={2}
                    {...register('residential_address')}
                  />
                </div>
                <FormInput
                  label="Country"
                  icon={Globe}
                  {...register('country')}
                />
                <FormSelect
                  label="State"
                  icon={MapPin}
                  options={stateOptions}
                  {...register('state')}
                />
                <FormInput
                  label="City"
                  icon={Building}
                  {...register('city')}
                />
                <FormInput
                  label="Postal Code"
                  {...register('postal_code')}
                />
              </div>
            </SectionCard>

            {/* Section 3: Academic Information */}
            <SectionCard icon={GraduationCap} title="Academic Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 flex items-center gap-3 col-span-full">
                  <Building className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 truncate">
                      Branch: <span className="font-semibold">{branchName || branchId || 'Loading...'}</span>
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">Branch is automatically assigned from your profile</p>
                  </div>
                </div>

                <FormSelect
                  label="Academic Session"
                  icon={Calendar}
                  error={errors.academic_session}
                  options={[
                    { value: currentSession || '2025/2026', label: currentSession || '2025/2026' },
                    { value: '2024/2025', label: '2024/2025' },
                    { value: '2026/2027', label: '2026/2027' },
                  ]}
                  {...register('academic_session')}
                />
                <FormSelect
                  label="Term"
                  error={errors.term}
                  options={[
                    { value: currentTerm || '1st Term', label: currentTerm || '1st Term' },
                    { value: '1st Term', label: '1st Term' },
                    { value: '2nd Term', label: '2nd Term' },
                    { value: '3rd Term', label: '3rd Term' },
                  ]}
                  {...register('term')}
                />
                <FormInput
                  label="Admission Date"
                  icon={Calendar}
                  type="date"
                  error={errors.admission_date}
                  {...register('admission_date')}
                />
                <FormSelect
                  label="Department"
                  options={departmentOptions}
                  {...register('department')}
                />
                <FormSelect
                  label="Class"
                  icon={GraduationCap}
                  error={errors.class_id}
                  options={classOptions}
                  loading={loadingClasses}
                  {...register('class_id')}
                />
                {classOptions.length === 0 && !loadingClasses && (
                  <div className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400 col-span-full">
                    No active classes found for this branch. Please contact administrator.
                  </div>
                )}
                <FormInput
                  label="Class Arm"
                  placeholder="A, B, C, etc."
                  {...register('class_arm')}
                />
                <FormInput
                  label="Roll Number"
                  {...register('roll_number')}
                />
                <FormSelect
                  label="House"
                  options={houseOptions}
                  loading={loadingHouses}
                  {...register('house')}
                />
                <FormSelect
                  label="School Bus"
                  options={[
                    { value: '', label: 'Select Bus' },
                    { value: 'bus1', label: 'Bus 1 - Red' },
                    { value: 'bus2', label: 'Bus 2 - Blue' },
                    { value: 'bus3', label: 'Bus 3 - Yellow' },
                    { value: 'none', label: 'None' },
                  ]}
                  {...register('school_bus')}
                />
                <FormSelect
                  label="Hostel"
                  options={[
                    { value: '', label: 'Select Hostel' },
                    { value: 'hostel1', label: 'Hostel A - Boys' },
                    { value: 'hostel2', label: 'Hostel B - Girls' },
                    { value: 'none', label: 'None' },
                  ]}
                  {...register('hostel')}
                />
                <FormInput
                  label="Previous School"
                  {...register('previous_school')}
                />
                <FormInput
                  label="Previous Class"
                  {...register('previous_class')}
                />
                <FormSelect
                  label="Student Status"
                  error={errors.student_status}
                  options={statusOptions}
                  {...register('student_status')}
                />
              </div>
            </SectionCard>

            {/* Section 4: Parent/Guardian Information */}
            <SectionCard icon={Users} title="Parent / Guardian">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="col-span-full">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Father's Information</h3>
                </div>
                <FormInput label="Father's Name" {...register('father_name')} />
                <FormInput label="Father's Phone" icon={Phone} {...register('father_phone')} />
                <FormInput label="Father's Email" icon={Mail} type="email" {...register('father_email')} />
                <FormInput label="Father's Occupation" {...register('father_occupation')} />
                
                <div className="col-span-full">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 mt-4">Mother's Information</h3>
                </div>
                <FormInput label="Mother's Name" {...register('mother_name')} />
                <FormInput label="Mother's Phone" icon={Phone} {...register('mother_phone')} />
                <FormInput label="Mother's Email" icon={Mail} type="email" {...register('mother_email')} />
                <FormInput label="Mother's Occupation" {...register('mother_occupation')} />
                
                <div className="col-span-full">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 mt-4">Guardian Information</h3>
                </div>
                <FormInput label="Guardian's Name" {...register('guardian_name')} />
                <FormInput label="Guardian's Phone" icon={Phone} {...register('guardian_phone')} />
                <FormInput label="Guardian's Email" icon={Mail} type="email" {...register('guardian_email')} />
                <FormInput label="Guardian's Address" {...register('guardian_address')} />
                <FormInput label="Relationship" {...register('guardian_relationship')} />
                
                <div className="col-span-full">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 mt-4">Emergency Contact</h3>
                </div>
                <FormInput label="Emergency Contact Name" {...register('emergency_contact_name')} />
                <FormInput label="Emergency Contact Phone" icon={Phone} {...register('emergency_contact_phone')} />
              </div>
            </SectionCard>

            {/* Section 5: Medical Information */}
            <SectionCard icon={Heart} title="Medical Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <FormInput label="Hospital" icon={Building} {...register('hospital_name')} />
                <FormInput label="Doctor" icon={Stethoscope} {...register('doctor_name')} />
                <FormInput label="Doctor's Phone" icon={Phone} {...register('doctor_phone')} />
                <FormSelect
                  label="Blood Group"
                  options={bloodGroupOptions}
                  {...register('blood_group')}
                />
                <FormSelect
                  label="Genotype"
                  options={genotypeOptions}
                  {...register('genotype')}
                />
                <div className="sm:col-span-2 lg:col-span-3">
                  <FormTextarea
                    label="Medical Conditions"
                    icon={AlertTriangle}
                    rows={2}
                    placeholder="List any medical conditions..."
                    {...register('medical_conditions')}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <FormTextarea
                    label="Allergies"
                    icon={Pill}
                    rows={2}
                    placeholder="List any allergies..."
                    {...register('allergies')}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <FormTextarea
                    label="Special Needs"
                    icon={HelpCircle}
                    rows={2}
                    placeholder="Any special needs..."
                    {...register('special_needs')}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <FormTextarea
                    label="Medication"
                    icon={Pill}
                    rows={2}
                    placeholder="Current medications..."
                    {...register('medication')}
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <FormTextarea
                    label="Health Notes"
                    icon={Heart}
                    rows={2}
                    placeholder="Additional health notes..."
                    {...register('health_notes')}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Section 6: Account Information */}
            <SectionCard icon={Lock} title="Account Information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormInput
                  label="Student Username"
                  icon={User}
                  {...register('student_username')}
                />
                <FormInput
                  label="Password"
                  icon={Lock}
                  type="password"
                  defaultValue="1234567"
                  {...register('password')}
                />
                <FormInput
                  label="Confirm Password"
                  icon={Lock}
                  type="password"
                  defaultValue="1234567"
                  {...register('confirm_password')}
                />
                <div className="sm:col-span-2 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-800"
                      {...register('allow_student_login')}
                    />
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Allow student login</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-800"
                      {...register('generate_password_automatically')}
                    />
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Generate password automatically</span>
                  </label>
                </div>
              </div>
            </SectionCard>

            {/* Section 7: Other Information */}
            <SectionCard icon={Notebook} title="Other Information">
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                <FormTextarea
                  label="Student Bio"
                  rows={3}
                  placeholder="Brief biography of the student..."
                  {...register('student_bio')}
                />
                <FormTextarea
                  label="Notes"
                  rows={2}
                  placeholder="Additional notes..."
                  {...register('notes')}
                />
                <FormTextarea
                  label="Remarks"
                  rows={2}
                  placeholder="Any remarks..."
                  {...register('remarks')}
                />
              </div>
            </SectionCard>

            {/* Info Notice */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3"
            >
              <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <p>• <strong>Email is required</strong> for login access.</p>
                <p>• All other fields are optional. Fill only what you have.</p>
                <p>• Admission Number and Student ID are generated automatically.</p>
                <p>• Branch is automatically assigned from your profile.</p>
                <p>• Default password is <strong>1234567</strong>.</p>
                <p>• Student username is auto-filled with the email address.</p>
                <p>• State of Origin auto-populates LGA options.</p>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-4"
            >
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    reset({
                      ...watch(),
                      password: '1234567',
                      confirm_password: '1234567',
                      allow_student_login: true,
                      generate_password_automatically: true,
                    });
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-105 hover:shadow-md text-sm w-full sm:w-auto"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={isSubmitting || loadingClasses || isCheckingEmail}
                  className="flex items-center justify-center gap-2 px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Registering...
                    </>
                  ) : isCheckingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4" />
                      Register Student
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-blue-600 text-blue-600 rounded-xl font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 hover:scale-105 hover:shadow-md text-sm sm:text-base w-full sm:w-auto"
                >
                  <PlusCircle className="w-4 h-4" />
                  Register & Add Another
                </button>
              </div>
            </motion.div>
          </form>
        </div>

        {/* Right Column - Bulk Import Card */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="sticky top-8"
          >
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-4 sm:p-6 text-white shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm sm:text-base">Bulk Import Students</h3>
                  <p className="text-xs text-white/80">Import thousands from Excel or CSV</p>
                </div>
              </div>

              {/* Upload Zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-4 sm:p-6 text-center transition-all duration-300 ${
                  isDragging
                    ? 'border-white bg-white/20 scale-105'
                    : 'border-white/30 hover:border-white/60'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <motion.div
                  animate={isDragging ? { scale: 1.05 } : { scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <CloudUpload className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 text-white/60" />
                  <p className="text-xs sm:text-sm font-medium mb-1">Drag & Drop your file here</p>
                  <p className="text-[10px] sm:text-xs text-white/60 mb-2 sm:mb-3">or</p>
                  <label className="cursor-pointer">
                    <span className="inline-block px-3 sm:px-4 py-1.5 sm:py-2 bg-white/20 rounded-lg text-xs sm:text-sm font-medium hover:bg-white/30 transition-all hover:scale-105">
                      Choose File
                    </span>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                    />
                  </label>
                  <p className="text-[10px] sm:text-xs text-white/50 mt-2">Accepts .csv, .xlsx, .xls</p>
                </motion.div>
              </div>

              {/* Upload Progress */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-4">
                  <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="bg-white h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-xs text-white/60 mt-1">{uploadProgress}% uploaded</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 space-y-2">
                <button 
                  onClick={downloadTemplate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/20 rounded-lg text-xs sm:text-sm hover:bg-white/30 transition-all hover:scale-105"
                >
                  <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                  Download Template
                </button>
                <button 
                  onClick={() => setShowPreview(true)}
                  disabled={importRecords.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/20 rounded-lg text-xs sm:text-sm hover:bg-white/30 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                  Preview Import ({importRecords.length})
                </button>
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/20 rounded-lg text-xs sm:text-sm hover:bg-white/30 transition-all hover:scale-105"
                >
                  <History className="w-3 h-3 sm:w-4 sm:h-4" />
                  Import History ({importHistory.length})
                </button>
              </div>
            </div>

            {/* Import Features */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-4 sm:mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-6"
            >
              <h4 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Import Features</h4>
              <div className="grid grid-cols-2 gap-1 sm:gap-2">
                {[
                  'CSV',
                  'Excel',
                  'Duplicate Detection',
                  'Validation',
                  'Preview',
                  'Batch Import',
                  'Rollback',
                  'Progress',
                  'Error Report',
                  'Success Report',
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-1 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-500" />
                    {feature}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Import Instructions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-4 sm:mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-6"
            >
              <h4 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Import Instructions</h4>
              <ol className="space-y-1 sm:space-y-2 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 list-decimal list-inside">
                <li>Download Template</li>
                <li>Fill Student Records</li>
                <li>Save Excel File</li>
                <li>Upload File</li>
                <li>Preview Records</li>
                <li>Import Students</li>
              </ol>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && importRecords.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Import Preview</h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {importRecords.filter(r => r.status === 'valid').length} valid records found
                  </p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all self-end"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                <div className="space-y-2">
                  {importRecords.map((record) => (
                    <div
                      key={record.row}
                      className={`p-2 sm:p-3 rounded-lg border ${
                        record.status === 'valid' 
                          ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                          : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Row {record.row}
                            </span>
                            <span className={`text-xs font-medium ${
                              record.status === 'valid' 
                                ? 'text-green-600 dark:text-green-400' 
                                : 'text-red-600 dark:text-red-400'
                            }`}>
                              {record.status === 'valid' ? '✓ Valid' : '✗ Invalid'}
                            </span>
                          </div>
                          <div className="mt-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300 truncate">
                            {record.data['First Name'] || 'No name'} {record.data['Last Name'] || ''}
                            {record.data['Class Name'] && ` - ${record.data['Class Name']}`}
                          </div>
                          {record.errors.length > 0 && (
                            <div className="mt-1 text-xs text-red-500">
                              {record.errors.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowPreview(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm"
                >
                  Close
                </button>
                <button
                  onClick={processImport}
                  disabled={importing || importRecords.filter(r => r.status === 'valid').length === 0}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import {importRecords.filter(r => r.status === 'valid').length} Records
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Import History</h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Last 10 imports
                  </p>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all self-end"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                {importHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <FileText className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p>No import history found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {importHistory.map((item: any) => (
                      <div
                        key={item.id}
                        className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">{item.file_name}</p>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              {dayjs(item.created_at).format('MMMM D, YYYY h:mm A')}
                            </p>
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="flex items-center gap-3">
                              <span className="text-xs sm:text-sm text-green-600 dark:text-green-400">
                                ✓ {item.success_count}
                              </span>
                              {item.error_count > 0 && (
                                <span className="text-xs sm:text-sm text-red-600 dark:text-red-400">
                                  ✗ {item.error_count}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Total: {item.total_records}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowHistory(false)}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StudentRegistrationForm;