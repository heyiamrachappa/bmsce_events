# Google Sheets API Setup Guide

To enable the "Export to Google Sheet" feature, follow these steps to set up a Google Cloud Project and Service Account.

## 1. Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `BMSCE-Events-Export` (or any name you prefer).

## 2. Enable APIs
1. In the sidebar, go to **APIs & Services > Library**.
2. Search for and enable:
   - **Google Sheets API**
   - **Google Drive API**

## 3. Create a Service Account
1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials > Service Account**.
3. Name it `export-service`, then click **Create and Continue**.
4. (Optional) Skip roles and click **Done**.
5. Click on the newly created service account in the list.
6. Go to the **Keys** tab.
7. Click **Add Key > Create New Key**.
8. Select **JSON** and click **Create**. This will download a JSON file.

## 4. Configure Supabase Secrets
You need to add the service account credentials to your Supabase Edge Functions.

1. Open the downloaded JSON file.
2. Run the following command in your terminal (using the Supabase CLI):
   ```bash
   supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='[PASTE_THE_ENTIRE_JSON_CONTENT_HERE]'
   ```
   *Note: Ensure the JSON is properly escaped or use a single line if needed. The edge function expects a valid JSON string.*

## 5. Testing
1. Ensure your Edge Function is deployed:
   ```bash
   supabase functions deploy export-to-sheets
   ```
2. In the Organizer Dashboard, you should now see the "Export to Google Sheet" icon (spreadsheet icon) next to your events.
3. Clicking it will create a new sheet and open it in a new tab.

## 6. Security Note
The service account creates sheets that it "owns". The edge function is configured to share these sheets with "Anyone with the link" as a reader, so organizers can view them. You can customize this behavior in `supabase/functions/export-to-sheets/index.ts` if you need stricter permissions.
