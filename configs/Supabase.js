import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: `./.env` });

const supabaseUrl = process.env.SUPABASE_URL || "https://jbcdjttfaxwendlfpgjk.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default supabase;
