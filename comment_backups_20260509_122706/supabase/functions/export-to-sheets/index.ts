
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('--- START EXPORT TASK ---')
    
    // 1. Get and Log Authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing Authorization header')
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const token = authHeader.replace('Bearer ', '')
    console.log('Verifying token...')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) {
      console.error('User Auth Failed:', userError)
      return new Response(JSON.stringify({ error: 'Invalid or expired session. Please sign out and sign in again.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`Authenticated User: ${user.email} (${user.id})`)

    // 2. Parse and Validate request
    const { eventId } = await req.json()
    console.log(`Target Event ID: ${eventId}`)
    
    // Strict UUID validation to prevent injection or malformed strings
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!eventId || !uuidRegex.test(eventId)) {
      console.error('Invalid Event ID format:', eventId)
      throw new Error('Invalid Event ID format')
    }

    // 3. Verify event ownership
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (eventError || !event) {
      console.error('Event Fetch Error:', eventError)
      throw new Error('Event not found')
    }
    
    if (event.created_by !== user.id) {
      console.error('Ownership Mismatch:', event.created_by, 'vs', user.id)
      throw new Error('Only the organizer can export this event')
    }

    // 4. Fetch confirmed registrants
    console.log('Fetching registrants...')
    const { data: registrations, error: regError } = await supabaseClient
      .from('event_registrations')
      .select('*')
      .eq('event_id', eventId)
      .eq('registration_status', 'confirmed')

    if (regError) {
      console.error('Registrations Fetch Error:', regError)
      throw regError
    }

    const rows = [['Name', 'USN', 'Department', 'Semester']]
    for (const reg of registrations) {
      rows.push([
        reg.student_name || 'N/A',
        reg.usn || 'N/A',
        reg.department || 'N/A',
        reg.semester || 'N/A'
      ])
    }
    
    // Fetch team members if applicable
    const { data: teams, error: teamsError } = await supabaseClient
      .from('registration_teams' as any)
      .select('id')
      .eq('event_id', eventId)
    
    if (!teamsError && teams && teams.length > 0) {
        console.log(`Found ${teams.length} teams, fetching members...`)
        const teamIds = teams.map(t => t.id)
        const { data: members, error: membersError } = await supabaseClient
            .from('team_members' as any)
            .select('*')
            .in('team_id', teamIds)
        
        if (!membersError && members) {
            for (const m of members) {
                const exists = rows.some(row => row[1] === m.usn)
                if (!exists) {
                    rows.push([m.name || 'N/A', m.usn || 'N/A', m.department || 'N/A', m.semester || 'N/A'])
                }
            }
        }
    }

    console.log(`Total rows to write: ${rows.length}`)

    // 5. Google Sheets Integration
    const credsJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    if (!credsJson) {
      console.error('GOOGLE_SERVICE_ACCOUNT_JSON is not set in secrets')
      throw new Error('Google service account not configured in Supabase secrets')
    }

    const credentials = JSON.parse(credsJson)
    console.log('Service Account Email:', credentials.client_email)

    // Get Access Token
    console.log('Fetching Google OAuth token...')
    const jwt = await getGoogleAccessToken(credentials)
    
    const { data: existingExport } = await supabaseClient
        .from('event_exports')
        .select('*')
        .eq('event_id', eventId)
        .single()

    let spreadsheetId = existingExport?.google_sheet_id
    let spreadsheetUrl = existingExport?.google_sheet_url

    if (!spreadsheetId) {
        console.log('Creating new spreadsheet...')
        const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${jwt}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                properties: { title: `Registrants - ${event.title}` },
            }),
        })
        if (!createRes.ok) {
          const err = await createRes.text()
          console.error('Google Sheets Creation Error:', err)
          throw new Error('Failed to create Google Sheet')
        }
        const sheetData = await createRes.json()
        spreadsheetId = sheetData.spreadsheetId
        spreadsheetUrl = sheetData.spreadsheetUrl
        
        console.log('Setting sheet permissions to "anyone with link"...')
        await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${jwt}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ role: 'reader', type: 'anyone' }),
        })
    }

    // Write data
    console.log(`Writing data to sheet ${spreadsheetId}...`)
    const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:E${rows.length + 1}?valueInputOption=RAW`, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${jwt}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: rows }),
    })
    if (!writeRes.ok) {
      const err = await writeRes.text()
      console.error('Google Sheets Write Error:', err)
      throw new Error('Failed to write data to Google Sheet')
    }

    // 6. Save/Update export info
    if (existingExport) {
        await supabaseClient
            .from('event_exports')
            .update({ updated_at: new Date().toISOString() })
            .eq('event_id', eventId)
    } else {
        await supabaseClient
            .from('event_exports')
            .insert({
                event_id: eventId,
                organizer_user_id: user.id,
                google_sheet_id: spreadsheetId,
                google_sheet_url: spreadsheetUrl,
            })
    }

    console.log('--- EXPORT TASK COMPLETED ---')
    return new Response(
      JSON.stringify({ url: spreadsheetUrl, message: existingExport ? 'Updated' : 'Created' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Task Error Catchall:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function getGoogleAccessToken(creds: any) {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const claim = {
    iss: creds.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const encodeBase64Url = (str: string | ArrayBuffer) => {
    let base64: string
    if (typeof str === 'string') {
        base64 = btoa(str)
    } else {
        base64 = btoa(String.fromCharCode(...new Uint8Array(str)))
    }
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  const encodedHeader = encodeBase64Url(JSON.stringify(header))
  const encodedClaim = encodeBase64Url(JSON.stringify(claim))
  const signatureInput = `${encodedHeader}.${encodedClaim}`
  
  const privateKey = creds.private_key.replace(/\\n/g, '\n')
  const pemContents = privateKey.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '')
  
  const keyData = new Uint8Array(atob(pemContents).split('').map(c => c.charCodeAt(0)))
  
  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signatureInput))
  const encodedSignature = encodeBase64Url(signature)

  const jwt = `${signatureInput}.${encodedSignature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })
  
  if (!res.ok) {
    const errorData = await res.json()
    console.error('Google Auth Token Error Data:', errorData)
    throw new Error(`Google Authentication failed: ${errorData.error_description || errorData.error}`)
  }
  
  const data = await res.json()
  return data.access_token
}
