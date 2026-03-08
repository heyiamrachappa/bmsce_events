import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, X, Sparkles, Trash2, Code, BookOpen } from "lucide-react";
import { format, parseISO } from "date-fns";

/* ─── Inline Markdown Renderer ─── */
function renderMarkdown(text: string) {
  // Split into blocks by double newline
  const blocks = text.split(/\n\n+/);
  return blocks.map((block, bi) => {
    // Code block
    const codeMatch = block.match(/^```(\w*)\n?([\s\S]*?)```$/);
    if (codeMatch) {
      return (
        <pre key={bi} className="bg-black/40 border border-white/10 rounded-lg p-3 my-1.5 overflow-x-auto text-xs font-mono text-emerald-300 leading-relaxed">
          <code>{codeMatch[2].trim()}</code>
        </pre>
      );
    }

    // Table (simple markdown table)
    const lines = block.split("\n");
    if (lines.length >= 2 && lines[0].includes("|") && lines[1].match(/^\s*\|?\s*[-:]+/)) {
      const headerCells = lines[0].split("|").map(c => c.trim()).filter(Boolean);
      const bodyRows = lines.slice(2).filter(l => l.includes("|"));
      return (
        <div key={bi} className="overflow-x-auto my-1.5">
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr>
                {headerCells.map((c, i) => (
                  <th key={i} className="border border-white/10 px-2 py-1 bg-white/5 text-left font-bold">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => {
                const cells = row.split("|").map(c => c.trim()).filter(Boolean);
                return (
                  <tr key={ri}>
                    {cells.map((c, ci) => (
                      <td key={ci} className="border border-white/10 px-2 py-1">{c}</td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // Regular block — parse inline
    return (
      <div key={bi} className={bi > 0 ? "mt-2" : ""}>
        {lines.map((line, li) => {
          // Header lines
          if (line.match(/^#{1,3}\s/)) {
            const stripped = line.replace(/^#{1,3}\s+/, "");
            return <div key={li} className="font-bold text-sm mt-1">{parseInline(stripped)}</div>;
          }
          // Bullet points
          if (line.match(/^\s*[-*•]\s/)) {
            const content = line.replace(/^\s*[-*•]\s+/, "");
            return <div key={li} className="flex gap-1.5 ml-1"><span className="text-primary/70 mt-0.5">•</span><span>{parseInline(content)}</span></div>;
          }
          // Numbered list
          if (line.match(/^\s*\d+[.)]\s/)) {
            const num = line.match(/^\s*(\d+)[.)]\s/)?.[1];
            const content = line.replace(/^\s*\d+[.)]\s+/, "");
            return <div key={li} className="flex gap-1.5 ml-1"><span className="text-primary/70 font-semibold min-w-[1rem]">{num}.</span><span>{parseInline(content)}</span></div>;
          }
          // Empty line
          if (!line.trim()) return <div key={li} className="h-1" />;
          // Normal line
          return <div key={li}>{parseInline(line)}</div>;
        })}
      </div>
    );
  });
}

function parseInline(text: string) {
  // Split by inline code, bold, italic markers
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Inline code
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/s);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(codeMatch[1]);
      parts.push(<code key={key++} className="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-amber-300">{codeMatch[2]}</code>);
      remaining = codeMatch[3];
      continue;
    }
    // Bold
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)$/s);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(boldMatch[1]);
      parts.push(<strong key={key++} className="font-bold text-white">{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
      continue;
    }
    // Italic
    const italicMatch = remaining.match(/^(.*?)\*(.+?)\*(.*)$/s);
    if (italicMatch) {
      if (italicMatch[1]) parts.push(italicMatch[1]);
      parts.push(<em key={key++} className="italic text-white/80">{italicMatch[2]}</em>);
      remaining = italicMatch[3];
      continue;
    }
    // No more matches
    parts.push(remaining);
    break;
  }
  return <>{parts}</>;
}

type ChatRole = "user" | "assistant";
type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
};

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// ─── Helpers ───

function normalize(text: string) { return text.trim().toLowerCase(); }

function extractQuoted(text: string) {
  const dq = text.match(/"([^"]+)"/);
  if (dq?.[1]) return dq[1].trim();
  const sq = text.match(/'([^']+)'/);
  if (sq?.[1]) return sq[1].trim();
  return null;
}

function extractEventName(text: string) {
  const quoted = extractQuoted(text);
  if (quoted) return quoted;
  const t = text.trim();
  const m1 = t.match(/\b(?:when is|when's|date of|time of)\b\s*(?:the\s*)?(?:event\s*)?(.*)$/i);
  if (m1?.[1]?.trim()) return m1[1].trim();
  const m2 = t.match(/\b(?:event|about|for)\b\s+(.*)$/i);
  if (m2?.[1]?.trim()) return m2[1].trim();
  return null;
}

function formatEventDate(iso: string | null | undefined) {
  if (!iso) return null;
  try { return format(parseISO(iso), "EEE, dd MMM yyyy • hh:mm a"); } catch { return iso; }
}

async function findEventsByTitleLike(titlePart: string) {
  const like = `%${titlePart.replace(/\s+/g, " ").trim()}%`;
  const { data, error } = await supabase
    .from("events")
    .select("id,title,start_date,end_date,location,venue,is_published,activity_points,registration_fee,description")
    .ilike("title", like)
    .eq("is_published", true)
    .order("start_date", { ascending: true })
    .limit(3);
  if (error) throw error;
  return data ?? [];
}

// ─── Comprehensive Rule-Based Responder ───

function ruleBasedRespond(raw: string): string | null {
  const t = normalize(raw);
  if (!t) return "Type a question and I'll do my best to help! 😊";

  // Greetings
  if (/^(hi|hey|hello|howdy|hola|namaste|good\s*(morning|afternoon|evening)|what'?s\s*up|sup)\b/i.test(t)) {
    return "Hey there! 👋 Welcome to BMSCE Events.\n\nI'm your AI assistant — I can help you with:\n- 📅 Finding events & their details\n- 📝 Registration & payment help\n- 🎓 Certificates & attendance\n- ⭐ Activity points\n- 🏛️ College clubs info\n- 🔐 Account & profile help\n\nWhat would you like to know?";
  }

  // Thanks / bye
  if (/^(thanks?|thank\s*you|ty|thx|goodbye|bye|see\s*ya|later)\b/i.test(t)) {
    return "You're welcome! 😊 Feel free to come back anytime if you have more questions. Have a great day! 🎉";
  }

  // Who are you / about bot
  if (/\b(who\s*are\s*you|what\s*are\s*you|about\s*you|your\s*name|what\s*can\s*you\s*do)\b/i.test(t)) {
    return "I'm the **BMSCE Events AI Assistant** 🤖\n\nI'm here to help students and organizers navigate the campus events platform.\n\n**I can help with:**\n- Finding events, dates, and venues\n- Registration & payment questions\n- How certificates and attendance work\n- Activity points and profiles\n- Club information and admin features\n- Account setup and troubleshooting\n\nJust ask me anything!";
  }

  // ─── About BMSCE / College ───

  if (/\b(about\s*bmsce|about\s*bms\s*college|what\s*is\s*bmsce|tell\s*me\s*about\s*bmsce|bms\s*college\s*of\s*engineering|about\s*college)\b/i.test(t)) {
    return "**BMS College of Engineering (BMSCE)** 🏛️\n\nBMSCE is one of the premier engineering colleges in Bangalore, India. Established in 1946 by the late Sri. B.M. Sreenivasaiah, it is affiliated to Visvesvaraya Technological University (VTU) and approved by AICTE.\n\n**Key highlights:**\n- Located in Bull Temple Road, Bangalore\n- Offers B.E., M.Tech, MBA, MCA & Ph.D programs\n- Autonomous institution with NAAC 'A+' grade\n- Home to 50+ active student clubs and organizations\n- Hosts 200+ events annually across tech, cultural, and sports categories\n\nThis platform helps you discover and participate in all BMSCE campus events! 🎯";
  }

  // ─── About this platform / website ───

  if (/\b(about\s*(this|the)\s*(platform|website|app|site|portal)|what\s*is\s*this\s*(platform|website|site|app)|how\s*does\s*this\s*(work|platform\s*work|website\s*work))\b/i.test(t)) {
    return "**BMSCE Events Platform** 🎯\n\nThis is the official event management platform for BMS College of Engineering.\n\n**For Students:**\n- Browse and discover campus events\n- Register for events (individual/group)\n- Track attendance and download certificates\n- View activity points earned\n- Get AI-powered assistance (that's me!)\n\n**For Club Organizers:**\n- Create and manage events\n- Track registrations\n- Mark attendance after events\n- Design and issue certificates\n- Set activity points for events\n\n**How to get started:**\n1. Click **Sign In** or **Get Started**\n2. Create an account with your college email\n3. Browse events on the **Discover** page\n4. Register for events you're interested in!";
  }

  // ─── Registration ───

  if (/\b(how\s*(?:to|do\s*i)\s*register|registration|sign\s*up\s*for|join\s*event|enroll|register\s*for)\b/i.test(t)) {
    return "**How to Register for Events** 📝\n\n**Step by step:**\n1. Go to the **Discover/Events** page\n2. Click on the event you want to join\n3. On the event details page, click **Register**\n4. Fill in your details (name, USN, email, phone)\n5. If the event has a fee, you'll be redirected to payment\n6. Once done, you'll see a confirmation!\n\n**Things to know:**\n- Some events allow **group registration** — add team members during signup\n- One-time registration per event (you can't register twice)\n- You need to be **signed in** to register\n- Check the event card for registration deadline and fee info\n- Your registered events appear on your **Dashboard**";
  }

  // ─── Payment / Fees ───

  if (/\b(payment|pay|fee|fees|refund|price|cost|how\s*much|ticket|free\s*events?)\b/i.test(t)) {
    return "**Payments & Fees** 💰\n\n- **Free events:** Many events are completely free — just register!\n- **Paid events:** The fee is shown on the event card and details page (e.g., ₹100, ₹200)\n- **Payment process:** After clicking Register, you'll be directed to the payment page\n- **Payment methods:** The platform supports online payment\n\n**Common questions:**\n- **Failed payment?** Try again from the event page. Your registration is only confirmed after successful payment\n- **Refunds?** Contact the event organizer directly for refund requests\n- **Can I check the fee before registering?** Yes! The fee is always visible on the event card and detail page\n- **Group events?** One payment covers all team members";
  }

  // ─── Certificates ───

  if (/\b(certificate|certificates|get\s*cert|download\s*cert|my\s*cert|how.*cert)\b/i.test(t)) {
    return "**Certificates** 🎓\n\n**How it works:**\n1. Attend the event (your attendance must be marked by the organizer)\n2. The organizer uploads a certificate template\n3. Go to your **Profile** page → **My Certificates** section\n4. Click **Download** next to the event — your personalized certificate (with your name, USN, and email) will be generated!\n\n**Important notes:**\n- ✅ You **must attend** the event — only students with marked attendance can download\n- 📋 The organizer chooses which details appear (name, USN, email)\n- 🖼️ Certificates are auto-generated as PNG images with your info overlaid on the template\n- 🔍 You can also find the download button on the **Event Details** page\n- ⏳ Certificates are available **after** the organizer sets up the template (usually after the event)";
  }

  // ─── Attendance ───

  if (/\b(attendance|attend|attended|mark\s*attendance|check.?in|present)\b/i.test(t)) {
    return "**Attendance System** ✅\n\n**For Students:**\n- Your attendance is marked by the **event organizer** after/during the event\n- You don't need to do anything — just attend the event!\n- Once marked present, you become eligible for **certificates** and your **activity points** are counted\n\n**For Organizers (Admin):**\n- Go to your **Dashboard**\n- Click the **clipboard icon** (✓) on the event card\n- Search for students or use the list of registered participants\n- Check the box next to each student who attended\n- You can also **Mark All** or **Clear All** for bulk actions\n\n**Note:** Only registered students appear in the attendance list.";
  }

  // ─── Activity Points ───

  if (/\b(activity\s*point|points|how.*points|what.*points|earn\s*points)\b/i.test(t)) {
    return "**Activity Points** ⭐\n\n**What are they?**\nActivity points are a way to track your participation in campus events. Each event can carry a certain number of points set by the organizer.\n\n**How they work:**\n- Each event may have activity points (e.g., 5 points, 10 points)\n- Points are visible on the **event details page**\n- Your **total accumulated points** are shown on your **Profile** page\n- Only events you **attended** count towards your total (attendance must be marked)\n\n**Why they matter:**\n- Track your campus engagement\n- Build a participation portfolio\n- Some departments may consider activity points for academic/co-curricular credits\n- Great for your resume and personal development!";
  }

  // ─── Profile / Account ───

  if (/\b(profile|my\s*account|account\s*settings|change\s*email|update\s*profile|my\s*info)\b/i.test(t)) {
    return "**Your Profile** 👤\n\n**What's on your profile page:**\n- Your name, email, and role (Student or Club Organizer)\n- College and club affiliation\n- **Total Activity Points** earned\n- **My Certificates** section — download all your earned certificates\n- Email change option\n- Club ownership transfer (for admins)\n\n**How to access:**\n1. Sign in to your account\n2. Click your profile icon or navigate to **/profile**\n\n**Change email:**\n- Enter your new email on the profile page\n- Click Update — a verification email will be sent to both old and new addresses";
  }

  // ─── Sign In / Sign Up / Auth ───

  if (/\b(sign\s*in|log\s*in|login|sign\s*up|create\s*account|forgot\s*password|reset\s*password|can'?t\s*login|unable\s*to\s*login|authentication)\b/i.test(t)) {
    return "**Account & Authentication** 🔐\n\n**Sign Up (New Users):**\n1. Click **Get Started** or **Sign In**\n2. Choose **Sign Up** tab\n3. Enter your name, college email, and password\n4. Select your college from the dropdown\n5. Verify your email and you're in!\n\n**Sign In (Existing Users):**\n1. Click **Sign In**\n2. Enter your email and password\n3. You'll be redirected to the events page\n\n**Forgot Password?**\n1. Click **Forgot Password** on the sign-in page\n2. Enter your email\n3. Check your inbox for a reset link\n4. Set your new password\n\n**Troubleshooting:**\n- Make sure you're using the correct email\n- Check spam folder for verification/reset emails\n- Clear browser cache if issues persist";
  }

  // ─── Dashboard ───

  if (/\b(dashboard|my\s*events|my\s*registrations|registered\s*events|organizer\s*dashboard)\b/i.test(t)) {
    return "**Dashboard** 📊\n\n**For Students:**\n- View all events you've **registered** for\n- See registration status and event dates\n- Quick access to event details\n\n**For Club Organizers:**\n- View all events you've **created**\n- **Create new events** with the + button\n- **Edit** existing events\n- **Manage attendance** — click the clipboard icon (✓)\n- **Design certificates** — click the award icon (🏆)\n- **Delete** events if needed\n- Monitor registration counts\n\n**Access:** Click **Dashboard** in the navigation bar (visible only when signed in).";
  }

  // ─── Creating Events (Admin) ───

  if (/\b(create\s*event|post\s*event|add\s*event|new\s*event|how.*organiz|how.*host|publish\s*event)\b/i.test(t)) {
    return "**Creating an Event (For Organizers)** 🎪\n\n**Steps:**\n1. Go to your **Dashboard**\n2. Click the **Create Event** button\n3. Fill in the details:\n   - **Title** — Name of the event\n   - **Description** — What the event is about\n   - **Category** — Tech, Cultural, Sports, etc.\n   - **Date & Time** — Start and end dates\n   - **Venue/Location** — Where the event will be held\n   - **Registration fee** — Set to 0 for free events\n   - **Max participants** — Optional limit\n   - **Activity Points** — Points awarded for attending\n   - **Cover image** — Upload an eye-catching banner\n4. Click **Create Event** to publish!\n\n**Note:** Only approved club organizers can create events. Apply via the **Apply as Admin** page.";
  }

  // ─── Clubs ───

  if (/\b(club|clubs|student\s*club|join\s*club|which\s*clubs|list\s*of\s*clubs|about\s*clubs)\b/i.test(t)) {
    return "**Student Clubs at BMSCE** 🏛️\n\nBMSCE has 50+ student clubs across various domains:\n- **Technical:** Coding clubs, robotics, AI/ML, cybersecurity\n- **Cultural:** Music, dance, drama, literary, art\n- **Sports:** Various sports clubs and teams\n- **Social:** NSS, IEEE, Rotaract, volunteer groups\n\n**On this platform:**\n- Each club has an approved **organizer** (admin)\n- Organizers can create events under their club\n- Students can browse events from any club\n- Club names appear on event cards and details\n\n**Want to create events for your club?**\n→ Apply as an admin via the **Apply as Admin** page\n→ Existing admins can also **transfer ownership** from their Profile page";
  }

  // ─── Apply as Admin ───

  if (/\b(apply\s*admin|become\s*admin|become\s*organizer|organizer\s*apply|how\s*to\s*become\s*organizer|admin\s*application|apply\s*as\s*admin)\b/i.test(t)) {
    return "**Becoming a Club Organizer** 🛡️\n\n**Steps:**\n1. Sign in to your student account\n2. Navigate to the **Apply as Admin** page\n3. Fill in the application:\n   - Select your **college**\n   - Enter your **club name**\n   - Provide a reason or description\n4. Submit your application\n5. Wait for approval from the platform super-admin\n\n**Once approved:**\n- Your role changes from Student to **Organizer**\n- You can create, edit, and manage events for your club\n- You can mark attendance and design certificates\n- You can transfer club ownership from your Profile page\n\n**Note:** Only one organizer per club. If leadership changes, use the **Club Transfer** feature on the Profile page.";
  }

  // ─── Events / Upcoming ───

  if (/\b(upcoming|events?\s*(coming\s*up|happening|scheduled|this\s*week|today|tomorrow|list)|what.*events?|any\s*events?|discover\s*events?|browse\s*events?|find\s*events?)\b/i.test(t)) {
    return "**Finding Events** 📅\n\n**Where to look:**\n- Go to the **Discover** / **Events** page from the navigation\n- Browse all published campus events\n- See event cards with title, date, venue, fee, and club name\n\n**What you can see:**\n- 📌 Event title & description\n- 📅 Date & time\n- 📍 Venue / location\n- 💰 Registration fee (or Free)\n- ⭐ Activity points\n- 👥 Number of registrations\n- 🏛️ Organizing club name\n\n**Tip:** If you're looking for a specific event, tell me the name and I'll look it up! For example:\n→ *\"When is Hackathon 2026?\"*\n→ *\"Tell me about the coding contest\"*";
  }

  // ─── Advantages / Why join ───

  if (/\b(advantages?|benefits?|why\s*(join|participate|attend|register|should)|perks|worth\s*it|reasons?\s*to\s*join)\b/i.test(t)) {
    return "**Why Participate in BMSCE Events?** 🌟\n\n**🎓 Academic Growth:**\n- Hands-on workshops and tech talks\n- Learn from industry professionals\n- Earn activity points for co-curricular credits\n\n**🤝 Networking:**\n- Connect with seniors, alumni & industry experts\n- Meet like-minded students from different branches\n- Build lasting friendships and professional contacts\n\n**📜 Credentials:**\n- Earn **certificates** for every event you attend\n- Accumulate **activity points** on your profile\n- Excellent additions to your resume/portfolio\n\n**🏆 Competition & Fun:**\n- Hackathons, quizzes, sports tournaments\n- Win prizes, swag, and recognition\n- Showcase your talents\n\n**💼 Career Boost:**\n- Develop soft skills: leadership, teamwork, time management\n- Exposure to real-world problems and solutions\n- Stand out in placements and higher education applications";
  }

  // ─── Results / Outcomes ───

  if (/\b(outcome|result|results|what\s*do\s*i\s*get|prize|prizes|what\s*happens\s*after|winning|winners)\b/i.test(t)) {
    return "**Event Outcomes & Prizes** 🏆\n\n**What you get from attending:**\n- 🎓 **Certificate of Participation** (downloadable from your Profile)\n- ⭐ **Activity Points** added to your profile\n- 📚 **Knowledge & Skills** from workshops and talks\n- 🤝 **Connections** with peers and industry people\n\n**For competitive events:**\n- 🥇 Prizes for winners (cash, merchandise, etc.)\n- 📢 Recognition and leaderboard mentions\n- 🏅 Special certificates for winners\n\n**After the event:**\n1. Organizer marks your attendance\n2. Certificate template is set up\n3. Download your certificate from Profile → My Certificates\n4. Activity points are automatically reflected on your profile";
  }

  // ─── Event details / specific event ───

  if (/\b(tell\s*(?:me\s*)?about|details?\s*(?:of|about|for)|what\s*is|info\s*(?:on|about))\b/i.test(t)) {
    const eventName = extractEventName(raw);
    if (eventName && eventName.length >= 3) {
      // Return null to let the async handler fetch event data
      return null;
    }
    return "I'd be happy to tell you about a specific event! Just mention the event name.\n\nExample: *\"Tell me about Hackathon 2026\"*";
  }

  // ─── When/date queries ───

  if (/\b(when|date|time|schedule|start|end|timing)\b/i.test(t)) {
    const eventName = extractEventName(raw);
    if (eventName && eventName.length >= 3) {
      return null; // async handler
    }
    return "I can look up event dates for you! Just mention the event name.\n\nExample: *\"When is the coding contest?\"*";
  }

  // ─── Venue / Location ───

  if (/\b(where|venue|location|place|address|which\s*hall|which\s*room)\b/i.test(t)) {
    const eventName = extractEventName(raw);
    if (eventName && eventName.length >= 3) {
      return null;
    }
    return "I can find event venues for you! Just mention the event name.\n\nExample: *\"Where is the music fest?\"*";
  }

  // ─── Group Registration ───

  if (/\b(group|team|team\s*registration|group\s*register|add\s*team|team\s*members)\b/i.test(t)) {
    return "**Group / Team Registration** 👥\n\n**How it works:**\n- Some events allow team/group registrations\n- When registering, you can add team member details\n- Each team member's info (name, USN, email) is recorded\n- One registration covers the entire team\n- Payment (if any) is handled once for the whole group\n\n**Steps:**\n1. Open the event and click **Register**\n2. Fill in your details as the team leader\n3. Add team members if the event supports groups\n4. Complete registration & payment";
  }

  // ─── Technical issues ───

  if (/\b(not\s*working|error|bug|issue|problem|can'?t|unable|broken|stuck|crashed|won'?t\s*load|loading\s*forever)\b/i.test(t)) {
    return "**Troubleshooting** 🔧\n\n**Common fixes:**\n1. **Refresh** the page (Ctrl+R / Cmd+R)\n2. **Clear browser cache** and cookies\n3. Try a different browser (Chrome recommended)\n4. Check your **internet connection**\n5. **Sign out and sign back in**\n\n**Specific issues:**\n- **Can't register?** → Make sure you're signed in and the event is still accepting registrations\n- **Payment failed?** → Try again. Check if your payment method is valid\n- **Certificate not showing?** → The organizer may not have set up the template yet. Check back later\n- **Page not loading?** → Try clearing browser cache or using incognito mode\n\nIf the issue persists, contact the event organizer or report it to the platform team.";
  }

  // ─── Contact / Help ───

  if (/\b(contact|help|support|reach\s*out|customer\s*service|complaint|feedback|report)\b/i.test(t)) {
    return "**Need Help?** 🆘\n\n**For event-specific questions:**\n- Contact the event organizer directly (their club info is on the event page)\n\n**For platform issues:**\n- Try common troubleshooting steps first (refresh, clear cache)\n- Report bugs through your college's tech support channels\n\n**For account issues:**\n- Use the **Forgot Password** feature to reset your password\n- Check your email for verification links (including spam folder)\n\n**I'm here 24/7** to answer any platform-related questions! Just ask. 😊";
  }

  // ─── Miscellaneous / fun ───

  if (/\b(joke|funny|tell\s*me\s*something|bored|entertain)\b/i.test(t)) {
    const jokes = [
      "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
      "Why did the student bring a ladder to the event? To reach new heights in learning! 📚",
      "What's a hacker's favorite season? Phishing season! 🎣",
      "How do BMSCE students party? They throw an Exception! 🎉",
      "Why do Java developers wear glasses? Because they don't C#! 👓",
      "A SQL query walks into a bar, sees two tables, and asks... 'Can I JOIN you?' 🍻",
    ];
    return jokes[Math.floor(Math.random() * jokes.length)] + "\n\n😄 Now, anything I can actually help you with?";
  }

  // ════════════════════════════════════════════
  // ─── CODING & DSA KNOWLEDGE (Rule-Based) ───
  // ════════════════════════════════════════════

  // ─── Arrays ───
  if (/\b(array|arrays|what\s*is\s*an?\s*array|array\s*operations|array\s*vs\s*linked)\b/i.test(t)) {
    return "**Arrays** 📦\n\n**Definition:** A contiguous block of memory storing elements of the same type, accessed by index.\n\n**Key Operations & Time Complexity:**\n- Access by index: **O(1)**\n- Search (unsorted): **O(n)**\n- Search (sorted, binary search): **O(log n)**\n- Insert at end: **O(1)** amortized\n- Insert at position: **O(n)** (shifting)\n- Delete at position: **O(n)** (shifting)\n\n**Common Problems:**\n- Two Sum → Use HashMap O(n)\n- Maximum Subarray → Kadane's Algorithm O(n)\n- Merge/Sort → Merge Sort O(n log n)\n- Sliding Window → Variable/fixed window techniques\n- Two Pointers → Sorted array problems\n\n**Types:** Static arrays, Dynamic arrays (ArrayList/vector), 2D arrays, Circular arrays";
  }

  // ─── Linked Lists ───
  if (/\b(linked\s*list|linkedlist|singly\s*linked|doubly\s*linked|circular\s*linked)\b/i.test(t)) {
    return "**Linked Lists** 🔗\n\n**Definition:** A linear data structure where elements (nodes) contain data + pointer to the next node.\n\n**Types:**\n- **Singly Linked List** — each node points to next\n- **Doubly Linked List** — each node points to next AND previous\n- **Circular Linked List** — last node points back to head\n\n**Time Complexity:**\n- Access: **O(n)**\n- Search: **O(n)**\n- Insert at head: **O(1)**\n- Insert at tail: **O(n)** (O(1) with tail pointer)\n- Delete: **O(n)**\n\n**Classic Problems:**\n- Reverse a linked list (iterative + recursive)\n- Detect cycle → Floyd's Tortoise & Hare\n- Find middle → Two pointers (slow/fast)\n- Merge two sorted lists\n- Remove Nth node from end\n\n**vs Array:** Linked lists win for frequent insertions/deletions; arrays win for random access.";
  }

  // ─── Stacks & Queues ───
  if (/\b(stack|stacks|queue|queues|lifo|fifo|push\s*pop|enqueue|dequeue|priority\s*queue)\b/i.test(t)) {
    return "**Stacks & Queues** 📚\n\n**Stack (LIFO — Last In, First Out):**\n- push(), pop(), peek() — all **O(1)**\n- Use cases: Undo, parentheses matching, DFS, function call stack\n- Problems: Valid parentheses, Min stack, Evaluate postfix, Next greater element\n\n**Queue (FIFO — First In, First Out):**\n- enqueue(), dequeue(), front() — all **O(1)**\n- Use cases: BFS, scheduling, buffering\n\n**Variants:**\n- **Deque** — insert/delete from both ends\n- **Priority Queue / Heap** — highest priority first, O(log n) insert/delete\n- **Circular Queue** — wraps around, efficient space usage\n\n**Common Patterns:**\n- Monotonic Stack → Next greater/smaller element\n- Sliding Window Max → Deque approach O(n)\n- BFS → Queue-based level-order traversal";
  }

  // ─── Trees ───
  if (/\b(tree|trees|binary\s*tree|bst|binary\s*search\s*tree|avl|trie|b\s*tree|heap|inorder|preorder|postorder|traversal)\b/i.test(t)) {
    return "**Trees** 🌳\n\n**Binary Tree:** Each node has at most 2 children.\n\n**Binary Search Tree (BST):**\n- Left child < parent < right child\n- Search/Insert/Delete: **O(log n)** average, **O(n)** worst\n\n**Traversals:**\n- **Inorder** (Left→Root→Right) — gives sorted order for BST\n- **Preorder** (Root→Left→Right) — copy/serialize tree\n- **Postorder** (Left→Right→Root) — delete tree\n- **Level Order** — BFS using queue\n\n**Balanced Trees:** AVL Tree, Red-Black Tree — guarantee O(log n)\n\n**Other Trees:**\n- **Trie** — prefix tree for strings, autocomplete\n- **Heap** — complete binary tree, Min/Max heap\n- **Segment Tree** — range queries O(log n)\n\n**Classic Problems:**\n- Height/Depth of tree\n- LCA (Lowest Common Ancestor)\n- Validate BST\n- Serialize/Deserialize\n- Diameter of binary tree";
  }

  // ─── Graphs ───
  if (/\b(graph|graphs|bfs|dfs|dijkstra|shortest\s*path|topological|adjacency|bellman|floyd|kruskal|prim|spanning\s*tree|connected\s*component)\b/i.test(t)) {
    return "**Graphs** 🕸️\n\n**Representations:**\n- Adjacency Matrix — O(V²) space, O(1) edge lookup\n- Adjacency List — O(V+E) space, most common\n\n**Traversals:**\n- **BFS** (queue) — shortest path (unweighted), level-order\n- **DFS** (stack/recursion) — cycle detection, connected components\n\n**Key Algorithms:**\n- **Dijkstra's** — shortest path (weighted, no negatives) O(V²) or O(E log V) with heap\n- **Bellman-Ford** — shortest path (handles negatives) O(VE)\n- **Floyd-Warshall** — all-pairs shortest path O(V³)\n- **Topological Sort** — DAG ordering (Kahn's BFS or DFS)\n- **Kruskal's / Prim's** — Minimum Spanning Tree\n- **Union-Find** — Disjoint set for connectivity\n\n**Classic Problems:**\n- Number of islands (DFS/BFS on grid)\n- Course schedule (topological sort)\n- Clone graph\n- Detect cycle (directed/undirected)\n- Network delay time (Dijkstra)";
  }

  // ─── Dynamic Programming ───
  if (/\b(dynamic\s*programming|dp|memoiz|tabulation|knapsack|fibonacci\s*dp|longest\s*common|lcs|lis|coin\s*change|optimal\s*substructure|overlapping\s*sub)\b/i.test(t)) {
    return "**Dynamic Programming (DP)** 🧠\n\n**Core Idea:** Solve complex problems by breaking them into overlapping subproblems, solving each once, and storing results.\n\n**Two Approaches:**\n1. **Top-Down (Memoization)** — Recursive + cache\n2. **Bottom-Up (Tabulation)** — Iterative, fill table\n\n**When to use DP:**\n- ✅ Optimal substructure (optimal solution uses optimal sub-solutions)\n- ✅ Overlapping subproblems (same subproblem solved multiple times)\n\n**Classic DP Problems:**\n- **Fibonacci** — O(n) instead of O(2ⁿ)\n- **0/1 Knapsack** — include/exclude items\n- **Longest Common Subsequence (LCS)**\n- **Longest Increasing Subsequence (LIS)**\n- **Coin Change** — min coins to make amount\n- **Edit Distance** — string transformation\n- **House Robber** — non-adjacent selection\n- **Matrix Chain Multiplication**\n- **Unique Paths** — grid traversal\n\n**Tips:** Start recursive → add memo → convert to tabulation → optimize space";
  }

  // ─── Sorting ───
  if (/\b(sort|sorting|bubble\s*sort|merge\s*sort|quick\s*sort|heap\s*sort|insertion\s*sort|selection\s*sort|radix|counting\s*sort|best\s*sorting|comparison\s*sort)\b/i.test(t)) {
    return "**Sorting Algorithms** 📊\n\n| Algorithm | Best | Average | Worst | Space | Stable? |\n|-----------|------|---------|-------|-------|---------|\n| Bubble Sort | O(n) | O(n²) | O(n²) | O(1) | ✅ |\n| Selection Sort | O(n²) | O(n²) | O(n²) | O(1) | ❌ |\n| Insertion Sort | O(n) | O(n²) | O(n²) | O(1) | ✅ |\n| Merge Sort | O(n log n) | O(n log n) | O(n log n) | O(n) | ✅ |\n| Quick Sort | O(n log n) | O(n log n) | O(n²) | O(log n) | ❌ |\n| Heap Sort | O(n log n) | O(n log n) | O(n log n) | O(1) | ❌ |\n| Counting Sort | O(n+k) | O(n+k) | O(n+k) | O(k) | ✅ |\n\n**Best general-purpose:** Merge Sort (stable, guaranteed O(n log n))\n**Best practical:** Quick Sort (fast in practice, O(n log n) average)\n**Best for small data:** Insertion Sort";
  }

  // ─── Searching ───
  if (/\b(search|searching|binary\s*search|linear\s*search|search\s*algorithm|bsearch)\b/i.test(t) && !/\b(event|register|certificate)\b/i.test(t)) {
    return "**Searching Algorithms** 🔍\n\n**Linear Search:**\n- Check every element one by one\n- Time: **O(n)** | Space: **O(1)**\n- Works on unsorted data\n\n**Binary Search:**\n- Divide sorted array in half repeatedly\n- Time: **O(log n)** | Space: **O(1)**\n- **Requires sorted data**\n\n**Binary Search Template:**\n```\nlow, high = 0, n-1\nwhile low <= high:\n    mid = (low + high) // 2\n    if arr[mid] == target: return mid\n    elif arr[mid] < target: low = mid + 1\n    else: high = mid - 1\n```\n\n**Variations:**\n- Find first/last occurrence\n- Search in rotated sorted array\n- Search in 2D matrix\n- Peak element\n- Sqrt(x), Koko eating bananas (binary search on answer)";
  }

  // ─── Time/Space Complexity ───
  if (/\b(time\s*complexity|space\s*complexity|big\s*o|big-o|asymptotic|o\(|complexity\s*analysis|notation)\b/i.test(t)) {
    return "**Time & Space Complexity** ⏱️\n\n**Big-O Notation (worst case):**\n\n| Notation | Name | Example |\n|----------|------|---------|\n| O(1) | Constant | Array access, HashMap get |\n| O(log n) | Logarithmic | Binary search |\n| O(n) | Linear | Linear search, single loop |\n| O(n log n) | Linearithmic | Merge sort, efficient sorts |\n| O(n²) | Quadratic | Nested loops, bubble sort |\n| O(2ⁿ) | Exponential | Recursive fibonacci, subsets |\n| O(n!) | Factorial | Permutations |\n\n**Quick Rules:**\n- Single loop → O(n)\n- Nested loop → O(n²)\n- Halving each step → O(log n)\n- Recursion with branching → O(2ⁿ) or O(branches^depth)\n\n**Space:** Count extra memory used (arrays, recursion stack, hash maps)";
  }

  // ─── Hash Maps / Hash Tables ───
  if (/\b(hash\s*map|hashmap|hash\s*table|hashtable|hashing|dictionary|hash\s*set|hashset|hash\s*function)\b/i.test(t)) {
    return "**Hash Maps / Hash Tables** #️⃣\n\n**Definition:** Key-value data structure with near O(1) average operations using a hash function.\n\n**Operations (Average):**\n- Insert: **O(1)**\n- Search: **O(1)**\n- Delete: **O(1)**\n- Worst case (collisions): **O(n)**\n\n**Collision Handling:**\n- **Chaining** — linked list at each bucket\n- **Open Addressing** — probe for next empty slot (linear, quadratic, double hashing)\n\n**Use Cases:**\n- Two Sum → store complement\n- Frequency counting\n- Anagram detection\n- Caching (LRU cache)\n- Group anagrams\n\n**In Languages:**\n- Python: `dict`, `set`\n- Java: `HashMap`, `HashSet`\n- C++: `unordered_map`, `unordered_set`\n- JavaScript: `Map`, `Set`, `Object`";
  }

  // ─── Recursion & Backtracking ───
  if (/\b(recursion|recursive|backtrack|backtracking|base\s*case|call\s*stack|n\s*queens|sudoku\s*solver|subset|permutation|combination)\b/i.test(t)) {
    return "**Recursion & Backtracking** 🔄\n\n**Recursion:**\n- Function calls itself with a smaller subproblem\n- Must have a **base case** to stop\n- Uses the **call stack** (O(depth) space)\n\n**Template:**\n```\ndef solve(args):\n    if base_case: return result\n    return solve(smaller_args)\n```\n\n**Backtracking:**\n- Try a choice → recurse → undo if it fails → try next\n- Systematic way to explore all possibilities\n\n**Classic Problems:**\n- **N-Queens** — place queens without attacking\n- **Sudoku Solver**\n- **Generate Parentheses**\n- **Subsets / Power Set**\n- **Permutations**\n- **Combinations / Combination Sum**\n- **Word Search** (grid DFS + backtrack)\n- **Rat in a Maze**\n\n**Tip:** Draw the recursion tree to understand the approach!";
  }

  // ─── Strings ───
  if (/\b(string|strings|palindrome|anagram|substring|subsequence|kmp|rabin\s*karp|string\s*matching|reversal|pattern\s*matching)\b/i.test(t) && /\b(dsa|algorithm|coding|reverse|check|find|match|problem|solve|how\s*to)\b/i.test(t)) {
    return "**String Algorithms** 📝\n\n**Common Operations:**\n- Reverse string: O(n)\n- Check palindrome: Two pointers O(n)\n- Anagram check: Sort or HashMap O(n)\n\n**Pattern Matching:**\n- **Brute Force:** O(n×m)\n- **KMP Algorithm:** O(n+m) using failure function\n- **Rabin-Karp:** O(n+m) average using rolling hash\n\n**Classic Problems:**\n- Longest Palindromic Substring (DP or Manacher's)\n- Longest Common Prefix\n- Group Anagrams (HashMap)\n- String to Integer (atoi)\n- Valid Palindrome (two pointers + skip non-alpha)\n- Minimum Window Substring (sliding window)\n- Longest Substring Without Repeating Characters\n\n**Tips:**\n- Strings are immutable in Python/Java — use StringBuilder/list\n- ASCII values useful for frequency arrays (size 26/128/256)";
  }

  // ─── Python ───
  if (/\b(python|python3?|pip|django|flask|pandas|numpy|python\s*syntax|learn\s*python)\b/i.test(t)) {
    return "**Python** 🐍\n\n**Why Python?**\n- Clean, readable syntax\n- Huge library ecosystem\n- Great for DSA, ML/AI, web dev, automation\n- Most popular for competitive programming (after C++)\n\n**Key DSA Structures:**\n- `list` → dynamic array\n- `dict` → hash map\n- `set` → hash set\n- `collections.deque` → double-ended queue\n- `heapq` → min heap\n- `collections.Counter` → frequency map\n- `collections.defaultdict` → auto-init dict\n\n**Useful Tricks:**\n- List comprehensions: `[x*2 for x in arr]`\n- Sorting: `sorted(arr, key=lambda x: x[1])`\n- Slicing: `arr[::-1]` (reverse)\n- Enumerate: `for i, val in enumerate(arr)`\n\n**For Web:** Flask, Django, FastAPI\n**For Data:** Pandas, NumPy, Matplotlib\n**For AI/ML:** TensorFlow, PyTorch, scikit-learn";
  }

  // ─── Java ───
  if (/\b(java[^s]|java$|jdk|jvm|spring|spring\s*boot|java\s*syntax|learn\s*java|java\s*collections)\b/i.test(t)) {
    return "**Java** ☕\n\n**Key Features:**\n- Strongly typed, OOP language\n- Platform independent (JVM — write once, run anywhere)\n- Widely used in enterprise, Android, backend\n\n**Collections Framework:**\n- `ArrayList` → dynamic array\n- `LinkedList` → doubly linked list\n- `HashMap` / `TreeMap` → key-value store\n- `HashSet` / `TreeSet` → unique elements\n- `PriorityQueue` → min heap\n- `Stack`, `Queue`, `Deque`\n\n**OOP Pillars:**\n- Encapsulation, Abstraction, Inheritance, Polymorphism\n- Interfaces, Abstract classes\n\n**Modern Java (8+):**\n- Lambda expressions\n- Streams API\n- Optional class\n- var keyword (10+)\n- Records (14+)\n\n**For Web:** Spring Boot, Jakarta EE\n**For Android:** Android SDK (now Kotlin preferred)";
  }

  // ─── C++ ───
  if (/\b(c\+\+|cpp|stl|competitive\s*programming|cp\b)\b/i.test(t)) {
    return "**C++** ⚡\n\n**Why C++ for DSA/CP?**\n- Fastest execution (compiled, low-level control)\n- Powerful STL (Standard Template Library)\n- Most popular for competitive programming\n\n**STL Containers:**\n- `vector` → dynamic array\n- `map` / `unordered_map` → sorted / hash map\n- `set` / `unordered_set` → sorted / hash set\n- `priority_queue` → max heap (use greater<> for min)\n- `stack`, `queue`, `deque`\n- `pair`, `tuple`\n\n**Essential STL Functions:**\n- `sort()`, `reverse()`, `lower_bound()`, `upper_bound()`\n- `accumulate()`, `count()`, `find()`\n- `next_permutation()`, `max_element()`\n\n**CP Template:**\n```\n#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(NULL);\n    // solution\n}\n```";
  }

  // ─── JavaScript / TypeScript ───
  if (/\b(javascript|typescript|js\b|ts\b|node\.?js|react|angular|vue|es6|ecmascript|dom|async\s*await|promise)\b/i.test(t)) {
    return "**JavaScript / TypeScript** 💛\n\n**JavaScript:**\n- Language of the web (browser + Node.js)\n- Dynamic typing, prototype-based OOP\n- Async programming: Promises, async/await\n\n**Key Concepts:**\n- Closures, Hoisting, Event Loop\n- `const`, `let`, `var` scoping\n- Arrow functions: `(x) => x * 2`\n- Destructuring: `const { a, b } = obj`\n- Spread/Rest: `...args`\n- Array methods: `map`, `filter`, `reduce`, `forEach`\n\n**TypeScript:**\n- JavaScript + static types\n- Interfaces, Generics, Enums\n- Compile-time error checking\n- Industry standard for large projects\n\n**Frameworks:**\n- **Frontend:** React, Angular, Vue, Next.js\n- **Backend:** Node.js, Express, Fastify\n- **Mobile:** React Native, Ionic\n\n**For DSA in JS:**\n- Arrays, Objects (hash maps), Map, Set\n- No built-in heap/tree — implement manually";
  }

  // ─── OOP ───
  if (/\b(oop|object\s*oriented|encapsulation|inheritance|polymorphism|abstraction|class|classes|interface|abstract\s*class|solid\s*principles|design\s*pattern)\b/i.test(t)) {
    return "**Object-Oriented Programming (OOP)** 🏗️\n\n**4 Pillars:**\n1. **Encapsulation** — Bundle data + methods, hide internals (private/public)\n2. **Abstraction** — Hide complexity, expose essentials (interfaces/abstract classes)\n3. **Inheritance** — Child class inherits parent's properties/methods\n4. **Polymorphism** — Same interface, different implementations (method overriding/overloading)\n\n**SOLID Principles:**\n- **S**ingle Responsibility — one class, one job\n- **O**pen/Closed — open for extension, closed for modification\n- **L**iskov Substitution — subtypes must be substitutable\n- **I**nterface Segregation — many specific interfaces > one general\n- **D**ependency Inversion — depend on abstractions, not concretions\n\n**Design Patterns:**\n- Creational: Singleton, Factory, Builder\n- Structural: Adapter, Decorator, Proxy\n- Behavioral: Observer, Strategy, Command";
  }

  // ─── DBMS / SQL ───
  if (/\b(dbms|database|sql|mysql|postgres|mongodb|normalization|acid|join|joins|foreign\s*key|primary\s*key|index|relational|nosql|query|select\s*from)\b/i.test(t)) {
    return "**Database & SQL** 🗄️\n\n**Relational (SQL):** MySQL, PostgreSQL, SQLite, Oracle\n**NoSQL:** MongoDB, Redis, Cassandra, DynamoDB\n\n**Key SQL Commands:**\n- `SELECT`, `INSERT`, `UPDATE`, `DELETE`\n- `JOIN` (INNER, LEFT, RIGHT, FULL)\n- `GROUP BY`, `HAVING`, `ORDER BY`\n- `WHERE`, `LIKE`, `IN`, `BETWEEN`\n- Subqueries, CTEs, Window functions\n\n**Normalization:**\n- 1NF: Atomic values, no repeating groups\n- 2NF: 1NF + no partial dependencies\n- 3NF: 2NF + no transitive dependencies\n- BCNF: Stricter 3NF\n\n**ACID Properties:**\n- **A**tomicity — all or nothing\n- **C**onsistency — valid state transitions\n- **I**solation — concurrent transactions don't interfere\n- **D**urability — committed data persists\n\n**Indexing:** B-Tree, Hash index — speeds up queries at cost of write speed";
  }

  // ─── Operating Systems ───
  if (/\b(operating\s*system|os\s*concept|process|thread|deadlock|semaphore|mutex|virtual\s*memory|paging|scheduling|cpu\s*scheduling|context\s*switch|memory\s*management)\b/i.test(t)) {
    return "**Operating Systems** 🖥️\n\n**Process vs Thread:**\n- Process: Independent, own memory space\n- Thread: Lightweight, shares memory with parent process\n\n**CPU Scheduling:**\n- FCFS, SJF, Priority, Round Robin, MLFQ\n- Preemptive vs Non-preemptive\n\n**Synchronization:**\n- **Mutex** — mutual exclusion lock\n- **Semaphore** — counting lock\n- **Deadlock conditions:** Mutual exclusion, Hold & wait, No preemption, Circular wait\n- **Prevention:** Break any one condition\n\n**Memory Management:**\n- Paging — fixed-size blocks\n- Segmentation — variable-size logical blocks\n- Virtual Memory — disk as extended RAM\n- Page Replacement: FIFO, LRU, Optimal\n\n**File Systems:** FAT, NTFS, ext4, inodes";
  }

  // ─── Web Development ───
  if (/\b(web\s*dev|frontend|backend|full\s*stack|html|css|api|rest\s*api|http|https|responsive|deploy|hosting|cors|authentication)\b/i.test(t) && !/\b(event|register|certificate|bmsce)\b/i.test(t)) {
    return "**Web Development** 🌐\n\n**Frontend (Client-side):**\n- **HTML** — structure\n- **CSS** — styling (Flexbox, Grid, Tailwind, Bootstrap)\n- **JavaScript** — interactivity\n- **Frameworks:** React, Angular, Vue, Next.js, Svelte\n\n**Backend (Server-side):**\n- **Node.js** (Express, Fastify)\n- **Python** (Django, Flask, FastAPI)\n- **Java** (Spring Boot)\n- **Go**, **Rust**, **Ruby on Rails**\n\n**Database:** PostgreSQL, MySQL, MongoDB, Supabase, Firebase\n\n**Key Concepts:**\n- REST API — GET, POST, PUT, DELETE\n- Authentication — JWT, OAuth, Sessions\n- CORS — Cross-Origin Resource Sharing\n- Responsive Design — media queries, mobile-first\n\n**DevOps:** Git, Docker, CI/CD, Vercel, Netlify, AWS";
  }

  // ─── Git / Version Control ───
  if (/\b(git|github|version\s*control|commit|branch|merge|pull\s*request|clone|push|gitignore)\b/i.test(t)) {
    return "**Git & Version Control** 🔀\n\n**Essential Commands:**\n```\ngit init                 # Initialize repo\ngit clone <url>          # Clone remote repo\ngit add .                # Stage all changes\ngit commit -m \"message\"  # Commit staged changes\ngit push origin main     # Push to remote\ngit pull                 # Fetch + merge\n```\n\n**Branching:**\n```\ngit branch feature-x     # Create branch\ngit checkout feature-x   # Switch branch\ngit merge feature-x      # Merge into current\ngit branch -d feature-x  # Delete branch\n```\n\n**Best Practices:**\n- Commit often with clear messages\n- Use feature branches\n- Pull before push\n- Use .gitignore for secrets/node_modules\n- Write meaningful PR descriptions";
  }

  // ─── Interview Tips ───
  if (/\b(interview|interview\s*tips|placement|prepare|crack|how\s*to\s*get\s*placed|dsa\s*prepare|coding\s*interview|leetcode|codeforces|hackerrank|practice)\b/i.test(t)) {
    return "**Coding Interview Preparation** 💼\n\n**Roadmap:**\n1. **Learn a language** well (Python/Java/C++)\n2. **Master DSA fundamentals** — Arrays, Strings, LinkedList, Trees, Graphs, DP\n3. **Practice on platforms:**\n   - **LeetCode** — best for interviews (Easy → Medium → Hard)\n   - **Codeforces** — competitive programming\n   - **HackerRank** — structured learning\n   - **GeeksForGeeks** — theory + practice\n   - **NeetCode** — curated problem lists\n\n**Must-Do Patterns (top 15):**\n- Two Pointers, Sliding Window\n- Binary Search variations\n- BFS/DFS traversals\n- Dynamic Programming\n- Backtracking\n- Greedy algorithms\n- Stack/Queue patterns\n- HashMap/HashSet tricks\n\n**Interview Tips:**\n- Think aloud — explain your approach\n- Start with brute force, then optimize\n- Ask clarifying questions\n- Handle edge cases\n- Practice mock interviews!\n\n**BMSCE Tip:** Join coding clubs and participate in hackathons on this platform to build skills! 🎯";
  }

  // ─── General coding / DSA query ───
  if (/\b(coding|programming|dsa|data\s*structure|algorithm|code|learn\s*to\s*code|how\s*to\s*code|competitive|cp\b)\b/i.test(t)) {
    return "**Coding & DSA Guide** 💻\n\nI can help you with any coding topic! Here are areas I know well:\n\n**Data Structures:**\n- Arrays, Linked Lists, Stacks, Queues\n- Trees (BST, AVL, Trie, Heap)\n- Graphs, Hash Maps, Hash Sets\n\n**Algorithms:**\n- Sorting (Merge, Quick, Heap sort...)\n- Searching (Binary Search, variations)\n- Dynamic Programming\n- Greedy Algorithms\n- Backtracking & Recursion\n- Graph algorithms (BFS, DFS, Dijkstra...)\n\n**Languages:**\n- Python, Java, C++, JavaScript/TypeScript\n\n**CS Fundamentals:**\n- OOP, DBMS, OS, Computer Networks\n\n**Other:**\n- Web Development, Git, Interview prep\n\nJust ask a specific question like:\n- *\"Explain binary search\"*\n- *\"How does dynamic programming work?\"*\n- *\"Compare merge sort vs quick sort\"*";
  }

  // ─── Catch-all — didn't match any pattern ───
  return null;
}

// ─── Gemini API Integration ───

const SYSTEM_PROMPT = `You are the **BMSCE AI Assistant** — a highly intelligent, knowledgeable, and friendly AI assistant that can answer ANY question on ANY topic. You are embedded in the BMSCE Campus Events platform, but your knowledge goes far beyond just events. You are equally an expert in coding, DSA, computer science, mathematics, science, general knowledge, career guidance, and anything else a student might ask.

You should answer EVERY question helpfully — whether it's about events, coding, algorithms, physics, history, career advice, interview prep, or anything else. Never refuse to answer a question by saying you only know about events.

═══ ABOUT THE PLATFORM ═══
This is the official event management platform for **BMS College of Engineering (BMSCE)**, Bangalore, India. It connects students with campus events organized by various student clubs.

═══ ABOUT BMSCE ═══
- BMS College of Engineering (BMSCE), established 1946 by Sri B.M. Sreenivasaiah
- Located at Bull Temple Road, Basavanagudi, Bangalore 560019
- Affiliated to VTU (Visvesvaraya Technological University), AICTE approved
- NAAC A+ accredited autonomous institution
- Offers B.E., M.Tech, MBA, MCA, Ph.D programs
- 50+ active student clubs, 200+ events annually

═══ PLATFORM FEATURES & PAGES ═══

**Home Page (/):**
- Landing page with hero section and platform overview
- "Explore Events" and "Join Community" CTAs
- Statistics: clubs, events, users

**Discover / Events Page (/events):**
- Browse all published campus events
- Each card shows: title, date, venue, fee, category, club name, activity points
- Click a card to view full details and register

**Event Details Page (/events/:id):**
- Full event information: description, date/time, venue, fee, max participants
- Registration count and capacity
- Activity points earned for attending
- Register button (for signed-in students)
- Group/team registration support (for applicable events)
- Certificate download (if attended and template exists)

**Auth Page (/auth):**
- Sign up: email, password, full name, college selection
- Sign in: email + password
- Forgot password link

**Dashboard (/dashboard):**
- For Students: shows all registered events
- For Organizers/Admins: shows created events with management buttons
  - Create new event
  - Edit event details
  - Mark attendance (clipboard icon)
  - Design certificates (award icon)
  - Delete events
  - Registration monitoring

**Profile Page (/profile):**
- User info: name, email, role, college, club (if admin)
- Total Activity Points accumulated
- "My Certificates" section — download certificates for attended events
- Change email option
- Club ownership transfer (admin only)

**Create Event (/create-event) — Admin only:**
- Title, description, category, dates, venue, fee, max participants
- Activity points field
- Cover image upload
- Published after creation

**Edit Event (/edit-event/:id) — Admin only:**
- Modify all event fields including activity points

**Apply as Admin (/apply-admin):**
- Students can apply to become a club organizer
- Select college, enter club name, provide reason
- Approved by super-admin

═══ KEY FEATURES ═══

**Registration System:**
- Students register for events with: name, USN, college email, phone
- Group/team registration supported for certain events
- Events can have registration fees or be free
- One registration per student per event
- Registration count shown on event cards

**Attendance System:**
- Organizers mark attendance after/during events from Dashboard
- Search students, individual checkboxes, bulk mark/clear
- Only registered students appear in attendance list
- Attendance required for certificates and activity points

**Certificate System:**
- Organizers choose from 6 dark-themed certificate templates (Dark Elegant, Dark Navy, Dark Purple, Dark Emerald, Dark Carbon, Dark Burgundy)
- Can also upload custom template images
- Templates auto-render: "BMS College of Engineering", club name, "Certificate of Participation", student name, event title, participation text
- Optionally include USN and email
- Students download personalized certificates as PNG from Profile or Event Detail page
- Only students with marked attendance can download

**Activity Points:**
- Organizers set points per event (e.g., 5, 10 points)
- Visible on event details page
- Accumulated total shown on student Profile
- Only attended events count toward total

**AI Chatbot (You!):**
- Available on every page (floating button, bottom-right)
- Answers questions about events, registration, certificates, attendance, points, clubs, account
- Real-time event data access

**Club Transfer:**
- Admin can transfer club ownership to another student
- Two-step process: admin proposes, then confirms departure
- New admin accepts the takeover
- Both parties must confirm through Profile page

═══ CODING, DSA & COMPUTER SCIENCE KNOWLEDGE ═══

You are also an expert coding tutor and can answer questions about:

**Data Structures:** Arrays, Linked Lists (singly/doubly/circular), Stacks, Queues (deque, priority queue), Hash Maps/Tables, Trees (binary, BST, AVL, trie, segment tree, B-tree), Heaps, Graphs (adjacency list/matrix), Disjoint Sets (Union-Find)

**Algorithms:** Sorting (bubble, selection, insertion, merge, quick, heap, counting, radix), Searching (linear, binary search + variations), Graph algorithms (BFS, DFS, Dijkstra, Bellman-Ford, Floyd-Warshall, topological sort, Kruskal, Prim), Dynamic Programming (memoization, tabulation, knapsack, LCS, LIS, coin change, edit distance, matrix chain, house robber), Greedy (activity selection, Huffman, fractional knapsack), Backtracking (N-queens, sudoku, subsets, permutations, combinations), Divide & Conquer, Sliding Window, Two Pointers, Bit Manipulation

**Time/Space Complexity:** Big-O notation, analysis of all standard algorithms, best/average/worst cases, amortized analysis

**Programming Languages:** Python (syntax, libraries, standard lib, list comprehensions, decorators, generators), Java (OOP, Collections framework, Streams, Spring), C++ (STL containers/algorithms, pointers, modern C++), JavaScript/TypeScript (ES6+, async/await, closures, DOM, Node.js, React), C, Go, Rust basics

**OOP Concepts:** Encapsulation, Abstraction, Inheritance, Polymorphism, SOLID principles, Design Patterns (Singleton, Factory, Observer, Strategy, Decorator, Adapter, etc.)

**Database & SQL:** Relational vs NoSQL, SQL commands (SELECT, JOIN, GROUP BY, subqueries, CTEs, window functions), Normalization (1NF-BCNF), ACID properties, Indexing, Transactions

**Operating Systems:** Processes vs Threads, CPU Scheduling (FCFS, SJF, RR, Priority), Synchronization (mutex, semaphore, deadlock), Memory Management (paging, segmentation, virtual memory, page replacement), File Systems

**Computer Networks:** OSI model, TCP/IP, HTTP/HTTPS, DNS, REST APIs, WebSockets, Load Balancing, CDN

**Web Development:** HTML/CSS/JS, Frontend frameworks (React, Angular, Vue), Backend (Node.js, Express, Django, Spring Boot), REST API design, Authentication (JWT, OAuth), Databases (PostgreSQL, MongoDB, Supabase), Deployment (Vercel, Docker, AWS)

**Git & Version Control:** Commands (init, clone, add, commit, push, pull, branch, merge, rebase), Branching strategies, Pull Requests, .gitignore

**Interview Prep:** LeetCode patterns, coding interview strategies, system design basics, behavioral interview tips, FAANG preparation roadmap, competitive programming tips

When answering coding questions:
- Provide clear explanations with examples
- Include time and space complexity
- Show code snippets when appropriate (use markdown code blocks)
- Compare approaches (brute force vs optimized)
- Mention related problems for practice
- Use tables for comparing algorithms
- Be encouraging and supportive to learners

═══ RESPONSE GUIDELINES ═══
1. **Answer EVERYTHING** — You are a general-purpose AI. Answer any question on any topic: coding, math, science, history, career advice, life tips, etc.
2. Use markdown formatting: **bold**, *italic*, bullet points, numbered lists, code blocks, tables
3. Use relevant emojis to make responses engaging
4. When asked about events, use the CURRENT EVENTS DATA provided
5. Keep responses well-structured with headers and sections
6. For step-by-step instructions, use numbered lists
7. For coding questions, include code examples, time/space complexity, and explain the intuition
8. Never make up event data. Only reference events from the data provided
9. Respond naturally — match the user's energy and formality level
10. If a question is about campus events AND something else, answer both parts
11. For academic subjects (math, physics, chemistry, etc.), give clear explanations with examples
12. For career/interview questions, give practical actionable advice
13. Be encouraging, supportive, and never dismissive of any question
14. You can explain concepts, solve problems, debug code, compare technologies, give recommendations — anything a smart tutor would do
15. Suggest practice resources when relevant (LeetCode, Khan Academy, GeeksForGeeks, etc.)`;

async function callGemini(messages: ChatMessage[], eventsContext: string): Promise<string> {
  const fullPrompt = `${SYSTEM_PROMPT}\n\n═══ CURRENT LIVE EVENTS DATA ═══\n${eventsContext}\n\n═══ CURRENT DATE ═══\n${new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;

  const apiMessages = messages.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: fullPrompt }] },
        contents: apiMessages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error(`Gemini API error ${response.status}:`, errorBody);
    throw new Error(`Gemini API error: ${response.status} - ${errorBody.substring(0, 200)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error("Gemini returned empty response:", JSON.stringify(data).substring(0, 500));
    throw new Error("Gemini returned empty response");
  }
  return text;
}

// ─── Main Component ───

export default function AiChatBot() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [eventsContext, setEventsContext] = useState("");
  const [chipMode, setChipMode] = useState<"events" | "coding">("events");
  const location = useLocation();
  const { user } = useAuth();

  const initialMessages: ChatMessage[] = useMemo(
    () => [
      {
        id: uid(),
        role: "assistant",
        createdAt: Date.now(),
        content: GEMINI_API_KEY
          ? "Hey! 👋 I'm the **BMSCE Events AI Assistant** powered by Gemini ✨\n\nI can help you with:\n- 📅 Event info, dates & venues\n- 📝 Registration & payments\n- 🎓 Certificates & attendance\n- ⭐ Activity points\n- 💻 Coding, DSA & interview prep\n- 🏛️ Clubs & admin features\n\nJust ask me anything!"
          : "Hey! 👋 I'm the **BMSCE Events Assistant**.\n\nI can help with:\n- 📅 Events & dates\n- 📝 Registration & fees\n- 🎓 Certificates & attendance\n- ⭐ Activity points\n- 💻 Coding & DSA help\n- 🏛️ Clubs info\n\nAsk me anything!",
      },
    ],
    [],
  );

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Smooth open/close animation
  const handleOpen = useCallback(() => {
    setOpen(true);
    requestAnimationFrame(() => setVisible(true));
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => setOpen(false), 200);
  }, []);

  // Page-aware context hint
  const pageHint = useMemo(() => {
    const p = location.pathname;
    if (p === "/" || p === "/index") return "home";
    if (p.startsWith("/events")) return "events";
    if (p.startsWith("/dashboard")) return "dashboard";
    if (p.startsWith("/profile")) return "profile";
    if (p.startsWith("/auth")) return "auth";
    if (p.startsWith("/create-event") || p.startsWith("/edit-event")) return "create";
    return "general";
  }, [location.pathname]);

  // Load events context
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const { data } = await supabase
          .from("events")
          .select("title, start_date, end_date, location, venue, registration_fee, activity_points, is_published, description, clubs(name), colleges(name), event_categories(name)")
          .eq("is_published", true)
          .order("start_date", { ascending: true })
          .limit(30);

        if (data && data.length > 0) {
          const ctx = data
            .map((e: any) => {
              const start = e.start_date ? format(parseISO(e.start_date), "MMM d, yyyy h:mm a") : "TBD";
              const end = e.end_date ? format(parseISO(e.end_date), "MMM d, yyyy h:mm a") : "";
              const fee = e.registration_fee ? `₹${e.registration_fee}` : "Free";
              const pts = e.activity_points || 0;
              const club = e.clubs?.name || "Unknown Club";
              const cat = e.event_categories?.name || "General";
              const desc = e.description ? e.description.substring(0, 100) + "..." : "";
              return `- ${e.title} | Club: ${club} | Category: ${cat} | Date: ${start}${end ? ` to ${end}` : ""} | Venue: ${e.venue || e.location || "TBD"} | Fee: ${fee} | Activity Points: ${pts} | ${desc}`;
            })
            .join("\n");
          setEventsContext(ctx);
        } else {
          setEventsContext("No upcoming events currently listed.");
        }
      } catch {
        setEventsContext("Unable to load events data.");
      }
    };
    loadEvents();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open]);

  async function respond(userText: string) {
    // Try Gemini API first — this handles ALL questions
    if (GEMINI_API_KEY) {
      try {
        const userMsg: ChatMessage = { id: uid(), role: "user", createdAt: Date.now(), content: userText };
        const allMessages = [...messages, userMsg];
        const geminiResponse = await callGemini(allMessages, eventsContext);
        return geminiResponse;
      } catch (err: any) {
        console.error("Gemini API failed:", err);
        // Don't silently fall through — try rule-based, but inform user if that also fails
      }
    }

    // Fallback to rule-based (covers events + coding + DSA)
    const ruleResult = ruleBasedRespond(userText);
    if (ruleResult) return ruleResult;

    // If no API key at all, show setup message
    if (!GEMINI_API_KEY) {
      return "⚠️ **Gemini API key not configured**\n\nTo enable full AI capabilities (answering any question on any topic), add your Gemini API key:\n\n1. Go to [Google AI Studio](https://aistudio.google.com/apikey)\n2. Create an API key\n3. Add it to your `.env` file:\n```\nVITE_GEMINI_API_KEY=\"your-key-here\"\n```\n4. Restart the dev server\n\nRight now I can only answer pre-programmed topics (events, coding basics, DSA). With Gemini, I can answer **anything**!";
    }

    // Gemini failed — tell the user
    return "😔 I'm having trouble connecting to the AI service right now.\n\nHere are some topics I can still help with offline:\n- 📅 Events, registration, certificates, attendance\n- 💻 Coding: arrays, linked lists, trees, graphs, DP\n- 📊 Sorting & searching algorithms\n- 🐍 Python, Java, C++, JavaScript\n- 🏗️ OOP, DBMS, OS concepts\n- 💼 Interview preparation\n\nTry asking about one of these, or retry your question in a moment!";
  }

  async function onSend(text?: string) {
    const toSend = (text ?? input).trim();
    if (!toSend || busy) return;

    setInput("");
    const userMsg: ChatMessage = { id: uid(), role: "user", createdAt: Date.now(), content: toSend };
    setMessages((m) => [...m, userMsg]);

    setBusy(true);
    try {
      const reply = await respond(toSend);
      const botMsg: ChatMessage = { id: uid(), role: "assistant", createdAt: Date.now(), content: reply };
      setMessages((m) => [...m, botMsg]);
    } finally {
      setBusy(false);
    }
  }

  function clearChat() {
    setMessages(initialMessages);
  }

  const eventChips = [
    { label: "📅 Events", text: "What events are coming up?" },
    { label: "📝 Register", text: "How do I register for an event?" },
    { label: "🎓 Certificates", text: "How do certificates work?" },
    { label: "⭐ Points", text: "What are activity points?" },
    ...(pageHint === "dashboard" ? [{ label: "📊 Dashboard", text: "How do I use the dashboard?" }] : []),
    ...(pageHint === "profile" ? [{ label: "👤 Profile", text: "What's on my profile page?" }] : []),
    ...(pageHint === "auth" ? [{ label: "🔐 Sign Up", text: "How do I create an account?" }] : []),
  ];

  const codingChips = [
    { label: "🧠 DSA", text: "How do I start learning DSA?" },
    { label: "📊 Sorting", text: "Compare all sorting algorithms" },
    { label: "🌳 Trees", text: "Explain binary search trees" },
    { label: "🕸️ Graphs", text: "Explain graph algorithms" },
    { label: "⚡ DP", text: "How does dynamic programming work?" },
    { label: "💼 Interview", text: "How to prepare for coding interviews?" },
  ];

  const activeChips = chipMode === "events" ? eventChips : codingChips;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!open ? (
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-glow gradient-primary text-white relative group transition-transform hover:scale-110 active:scale-95"
          onClick={handleOpen}
          aria-label="Open AI Assistant"
        >
          <MessageCircle className="h-6 w-6" />
          {GEMINI_API_KEY && (
            <Sparkles className="h-3.5 w-3.5 absolute -top-0.5 -right-0.5 text-amber-300 animate-pulse" />
          )}
          <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
        </Button>
      ) : (
        <Card
          className="w-[420px] max-w-[calc(100vw-2rem)] border-white/10 bg-black/80 backdrop-blur-2xl shadow-[0_25px_100px_rgba(0,0,0,0.7)] transition-all duration-200 origin-bottom-right"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1) translateY(0)" : "scale(0.95) translateY(10px)",
          }}
        >
          {/* Header */}
          <CardHeader className="py-3 px-4 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-black" />
                </div>
                <div>
                  <CardTitle className="text-sm font-black tracking-wide">
                    BMSCE AI Assistant
                  </CardTitle>
                  <span className="text-[11px] text-muted-foreground">
                    {GEMINI_API_KEY ? "⚡ Gemini AI • Online" : "🟢 Online"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 1 && (
                  <Button size="icon" variant="ghost" onClick={clearChat} className="h-7 w-7 text-muted-foreground hover:text-red-400" aria-label="Clear chat">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={handleClose} className="h-7 w-7" aria-label="Close chat">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Mode Toggle + Quick Chips */}
            <div className="pt-3 space-y-2">
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={chipMode === "events" ? "default" : "outline"}
                  className={`h-6 text-[10px] rounded-full px-2.5 ${chipMode === "events" ? "gradient-primary text-white border-0" : "border-white/10 bg-white/5"}`}
                  onClick={() => setChipMode("events")}
                >
                  <BookOpen className="h-3 w-3 mr-1" /> Events
                </Button>
                <Button
                  size="sm"
                  variant={chipMode === "coding" ? "default" : "outline"}
                  className={`h-6 text-[10px] rounded-full px-2.5 ${chipMode === "coding" ? "bg-emerald-600 hover:bg-emerald-700 text-white border-0" : "border-white/10 bg-white/5"}`}
                  onClick={() => setChipMode("coding")}
                >
                  <Code className="h-3 w-3 mr-1" /> Coding & DSA
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {activeChips.map((q) => (
                  <Button
                    key={q.label}
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px] rounded-full border-white/10 bg-white/5 hover:bg-white/10 px-2"
                    onClick={() => onSend(q.text)}
                    disabled={busy}
                  >
                    {q.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="px-4 py-0">
            <ScrollArea className="h-[370px] pr-2">
              <div className="space-y-3 py-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                    <div
                      className={[
                        "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-white/[0.04] border border-white/[0.08] text-foreground rounded-bl-md",
                      ].join(" ")}
                    >
                      {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
                    </div>
                  </div>
                ))}
                {busy && (
                  <div className="flex justify-start animate-in fade-in duration-200">
                    <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                        <span className="text-xs text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          </CardContent>

          {/* Input */}
          <CardFooter className="px-4 py-3 border-t border-white/5 gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={busy ? "⚡ Generating response..." : "Ask anything... events, coding, DSA"}
              className="bg-white/5 border-white/10 focus:border-primary/50 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onSend();
                }
              }}
              disabled={busy}
            />
            <Button
              size="icon"
              onClick={() => onSend()}
              disabled={busy || !input.trim()}
              className="gradient-primary text-white shrink-0 transition-transform active:scale-90"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
