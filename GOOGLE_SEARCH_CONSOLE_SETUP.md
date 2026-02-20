# Google Search Console Setup Guide
## Get Your Site Indexed and Monitor Performance

---

## WHAT IS GOOGLE SEARCH CONSOLE?

Google Search Console (GSC) is a free tool that helps you:
- ✅ Submit your sitemap to Google
- ✅ See which keywords bring traffic
- ✅ Monitor page performance in search results
- ✅ Find and fix technical SEO issues
- ✅ Check Core Web Vitals scores
- ✅ See which sites link to you

**Cost:** FREE
**Time to set up:** 15 minutes
**Maintenance:** 10 minutes/month

---

## STEP 1: SIGN UP

1. Go to: https://search.google.com/search-console
2. Sign in with your Google account (patrickcorr4@gmail.com)
3. Click "Add Property"
4. Choose "Domain" (recommended)
5. Enter: `patrickcorr.me`
6. Click "Continue"

---

## STEP 2: VERIFY OWNERSHIP

You have several options. Here are the easiest:

### Option A: DNS Record (Recommended)

Google will give you a TXT record that looks like:
```
google-site-verification=xxxxx_long_code_xxxxx
```

**If you use Cloudflare:**
1. Log into Cloudflare dashboard
2. Select patrickcorr.me
3. Go to DNS → Records
4. Click "Add Record"
5. Type: TXT
6. Name: @ (or leave blank)
7. Content: [paste Google code]
8. TTL: Auto
9. Save
10. Back in GSC, click "Verify"

**If you use another DNS provider:**
The process is similar — add a TXT record at the root domain.

### Option B: HTML File Upload

1. Download the HTML verification file from GSC
2. Upload it to: /var/www/portfolio/dist/
3. Make sure it's accessible at: https://www.patrickcorr.me/googlexxxxxxxx.html
4. Back in GSC, click "Verify"

### Option C: HTML Meta Tag

1. Copy the meta tag from GSC (looks like: `<meta name="google-site-verification" content="...">`)
2. Add it to your homepage `<head>` section
3. Redeploy site
4. Back in GSC, click "Verify"

**Note:** Option A (DNS) is best because it survives site rebuilds.

---

## STEP 3: SUBMIT YOUR SITEMAP

1. In GSC left sidebar, click "Sitemaps"
2. Enter sitemap URL: `sitemap.xml`
3. Click "Submit"
4. Wait 1-7 days for Google to process

**What happens:**
- Google will discover all your pages
- You'll see "Success" status when done
- Indexed pages count will appear

---

## STEP 4: SUBMIT IMAGE SITEMAP (Optional but Recommended)

1. In GSC, go to "Sitemaps"
2. Enter: `image-sitemap.xml`
3. Click "Submit"

This helps Google index your images for Google Images search.

---

## STEP 5: ADD WWW VERSION

You should add both versions of your site:

1. After verifying patrickcorr.me, click "Add Property" again
2. This time choose "URL prefix" (not Domain)
3. Enter: `https://www.patrickcorr.me`
4. Verify using any method (HTML file is easiest)
5. Submit sitemap again for this property

**Why:** Some links point to www, some to non-www. You want data on both.

---

## KEY REPORTS TO MONITOR

### 1. Performance Report (Most Important)

**What it shows:**
- Total clicks from Google
- Total impressions
- Average click-through rate (CTR)
- Average position in search results
- Which queries (keywords) bring traffic
- Which pages get the most clicks

**How to use it:**
- Check weekly for trends
- Look for keywords with high impressions but low CTR (opportunity to improve titles)
- Find new keywords you didn't expect
- See which pages are rising/falling

**Good benchmarks:**
- CTR: 2-5% is typical, 10%+ is excellent
- Average position: Top 10 is page 1, aim for top 3
- Growth: Look for month-over-month improvement

### 2. Coverage Report

**What it shows:**
- How many pages are indexed
- Pages with errors
- Pages excluded from indexing

**How to use it:**
- Aim for "Valid" pages to increase over time
- Fix "Error" pages immediately
- Check "Excluded" to understand why pages aren't indexed

**Common issues:**
- 404 errors (fix or redirect)
- Soft 404s (pages that say 404 but return 200)
- Duplicate content (canonical issues)
- Blocked by robots.txt (check Caddy config)

### 3. Core Web Vitals Report

**What it shows:**
- Page speed scores (LCP, FID, CLS)
- Mobile vs Desktop performance
- Which pages need improvement

**How to use it:**
- Aim for all green ("Good")
- Fix yellow ("Needs Improvement") pages
- Prioritize red ("Poor") pages
- Focus on mobile (Google uses mobile-first indexing)

### 4. Page Experience Report

**What it shows:**
- Combines Core Web Vitals + mobile-friendliness + HTTPS + no intrusive interstitials
- Overall "good page experience" percentage

**How to use it:**
- Aim for 90%+ good experience
- Check mobile usability issues

### 5. Mobile Usability Report

**What it shows:**
- Pages with mobile usability errors
- Specific issues (text too small, clickable elements too close, etc.)

**How to use it:**
- Fix all errors immediately
- Mobile is critical for construction industry (site managers on phones)

### 6. Links Report

**What it shows:**
- Which sites link to you (external links)
- Your most linked pages
- Internal linking structure

**How to use it:**
- Monitor new backlinks
- Identify link building opportunities
- Check internal linking (see strategy doc)

---

## IMPORTANT ACTIONS TO TAKE

### Weekly (Every Monday):
- [ ] Check Performance report for last 7 days
- [ ] Look for any major traffic drops
- [ ] Check Coverage report for new errors

### Monthly (First of month):
- [ ] Review Performance report (last 28 days vs previous period)
- [ ] Check Core Web Vitals for any new issues
- [ ] Review top 10 queries — any surprises?
- [ ] Check Links report for new backlinks
- [ ] Export data to spreadsheet for tracking

### Quarterly:
- [ ] Full technical audit using GSC data
- [ ] Review and update sitemap if structure changed
- [ ] Check all reports for trends and opportunities
- [ ] Compare to competitors (use third-party tools)

---

## SETTING UP EMAIL ALERTS

Get notified immediately when something goes wrong:

1. In GSC, click Settings (gear icon)
2. Click "Email preferences"
3. Enable:
   - [ ] Performance drops significantly
   - [ ] Coverage issues detected
   - [ ] Mobile usability issues
   - [ ] Core Web Vitals issues
4. Add backup email if desired

---

## CONNECTING TO GOOGLE ANALYTICS

Link GSC to GA4 for combined data:

1. In Google Analytics 4, go to Admin (gear icon)
2. Under Property column, click "Search Console Links"
3. Click "Link"
4. Select your GSC property
5. Select GA4 web data stream
6. Confirm

**Benefits:**
- See search query data in GA4
- Combine search data with user behavior
- Better attribution modeling

---

## CONNECTING TO PAGE SPEED INSIGHTS

GSC integrates with PageSpeed Insights:

1. In Core Web Vitals report, click a specific page
2. Click "Open in PageSpeed Insights"
3. Get detailed speed analysis
4. Follow recommendations

---

## TROUBLESHOOTING COMMON ISSUES

### Issue: Sitemap shows errors
**Fix:** 
- Check sitemap XML is valid (use xmlvalidation.com)
- Ensure URLs are canonical (consistent www/non-www)
- Check for 404s in the sitemap
- Resubmit after fixing

### Issue: Pages not being indexed
**Possible causes:**
- robots.txt blocking them (check /robots.txt)
- Noindex meta tag in HTML
- Canonical pointing elsewhere
- Low quality/thin content
- New site (Google takes time)

**Fix:**
- Check robots.txt allows the pages
- Check for noindex tags
- Request indexing via GSC URL Inspection tool
- Improve content if thin

### Issue: Sudden traffic drop
**Check:**
- Manual actions (Security & Manual Actions → Manual Actions)
- Core algorithm update timing
- Technical issues (Coverage report)
- Seasonality (construction is seasonal)

**Fix:**
- Address any manual actions
- Wait for algorithm update to settle
- Fix technical issues
- Continue building quality content

### Issue: High impressions, low clicks
**This means:** You're showing up in search but people aren't clicking

**Fix:**
- Improve page titles (make them compelling)
- Improve meta descriptions (add value proposition)
- Add rich snippets/schema markup
- Check if featured snippets are stealing clicks

---

## ADVANCED FEATURES

### URL Inspection Tool

Check any specific URL:
- Is it indexed?
- When was it last crawled?
- Any issues?
- Request indexing (for new pages)

**Use case:** Publish a new blog post → Submit to GSC for faster indexing

### Removals Tool

Temporarily remove pages from search:
- For pages you accidentally published
- For old content being updated
- For emergency reputation management

### Security Issues

If Google detects:
- Malware
- Phishing
- Harmful downloads

You'll see alerts here. **Fix immediately.**

### Core Updates

When Google rolls out algorithm updates, you'll see notices here. Check if your traffic changed.

---

## EXPORTING DATA

### Monthly Performance Export

1. Go to Performance report
2. Set date range (Last 28 days)
3. Click "EXPORT" (top right)
4. Choose "Google Sheets" or "CSV"
5. Save to: /SEO Reports/YYYY-MM/

### Track These Metrics:
- Total clicks
- Total impressions
- Average CTR
- Average position
- Top 10 queries
- Top 10 pages

### Create a Dashboard:

| Month | Clicks | Impressions | CTR | Avg Position |
|-------|--------|-------------|-----|--------------|
| Jan | 150 | 5,000 | 3% | 12 |
| Feb | 230 | 7,500 | 3.1% | 11 |
| Mar | 340 | 10,000 | 3.4% | 10 |

Look for trends and growth!

---

## GOOGLE SEARCH CONSOLE CHECKLIST

### Immediate (Today):
- [ ] Sign up at search.google.com/search-console
- [ ] Add patrickcorr.me property
- [ ] Verify ownership via DNS
- [ ] Submit sitemap.xml
- [ ] Submit image-sitemap.xml
- [ ] Add www.patrickcorr.me property
- [ ] Set up email alerts

### This Week:
- [ ] Connect to Google Analytics 4
- [ ] Review Coverage report
- [ ] Check Core Web Vitals
- [ ] Review Mobile Usability
- [ ] Request indexing for new blog posts

### Ongoing:
- [ ] Check Performance weekly
- [ ] Export data monthly
- [ ] Review and fix issues monthly
- [ ] Update sitemap when adding pages

---

## KEYWORDS TO EXPECT (First 3 Months)

Based on your content, you should start ranking for:

**Service keywords:**
- "microsoft 365 migration uk"
- "it support for construction companies"
- "starlink construction site"
- "cloud voip multi site"
- "ai cctv construction"

**Location keywords:**
- "it support london construction"
- "microsoft 365 consultant manchester"
- "it services birmingham construction"

**Blog keywords:**
- "how to choose it support company"
- "starlink for construction"
- "cybersecurity mistakes business"
- "m365 migration checklist"

**Monitor these in GSC and track improvements!**

---

## NEXT STEPS

1. ✅ Set up GSC today (15 minutes)
2. ✅ Verify ownership
3. ✅ Submit sitemaps
4. ✅ Wait 1 week for initial data
5. ✅ Review first reports
6. ✅ Set calendar reminders for weekly/monthly checks

**Questions?** Google has excellent documentation: https://support.google.com/webmasters

**Or email me:** patrickcorr4@gmail.com
