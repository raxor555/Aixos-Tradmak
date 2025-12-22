
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nlnaimqctdplgimpigdi.supabase.co';
const supabaseKey = 'sb_publishable_fxmLZAEqIB43Cbt2we5t6Q_db-h2t5y';

export const supabase = createClient(supabaseUrl, supabaseKey);
