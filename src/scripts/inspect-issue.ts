import 'dotenv/config'
import { config as loadDotenv } from 'dotenv'
import { createAdminSupabaseClient } from '../lib/supabase-admin'

loadDotenv({ path: '.env.local', override: true })

async function main() {
  const id = process.argv[2]
  if (!id) {
    console.error('Usage: tsx src/scripts/inspect-issue.ts <issueId>')
    process.exit(1)
  }
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('issues').select('*').eq('id', id).single()
  if (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
  console.log(JSON.stringify(data, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
