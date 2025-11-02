# 🎓 Fordham Logo Setup Instructions

## Quick Setup

### Option 1: Download Official Fordham Logo (Recommended)

1. **Get the Official Logo:**
   - Visit: https://www.fordham.edu/communications-and-public-affairs/university-brand-guidelines/
   - Or contact Fordham's Communications office for official branding assets
   - Download the PNG version of the logo (preferably horizontal layout with text)

2. **Save to Your Project:**
   ```bash
   # Save the logo as:
   frontend/public/fordham-logo.png
   ```

3. **Logo Specifications:**
   - Format: PNG with transparent background (preferred)
   - Size: Approximately 300-500px width
   - Aspect ratio: Preserve original
   - File size: Under 100KB

### Option 2: Use Fordham Shield/Ram Logo

If you have access to the Fordham Ram logo or shield:

```bash
# Save as:
frontend/public/fordham-logo.png
```

### Option 3: Temporary Placeholder (For Development)

While waiting for official assets, you can use this:

1. Create a temporary text-based logo (already in place as fallback)
2. Or download a public domain ram logo from sites like:
   - [Flaticon](https://www.flaticon.com) - search "ram"
   - [Vecteezy](https://www.vecteezy.com) - search "ram logo"

**Note:** Replace with official Fordham assets before deploying!

---

## File Locations

Your logo file should be saved as:
```
frontend/
└── public/
    └── fordham-logo.png    ← Save your logo here
```

The app will automatically display it in the header!

---

## Logo Guidelines (From Fordham Brand Standards)

Based on Fordham's typical branding:

### Colors:
- **Primary Maroon**: #8B2332 ✅ (Already applied)
- **White**: #FFFFFF ✅ (Already applied)

### Usage:
- Always maintain proper clear space around the logo
- Never distort or stretch the logo
- Use on white or maroon backgrounds
- Ensure good contrast for readability

### Minimum Size:
- Digital: 150px width minimum
- Print: 1 inch width minimum

---

## Alternative Logo Formats

If you have multiple versions:

1. **High-resolution version** (for header):
   ```
   frontend/public/fordham-logo.png
   ```

2. **Favicon** (browser tab icon):
   ```
   frontend/public/favicon.ico
   ```

3. **Different sizes** (optional):
   ```
   frontend/public/logo192.png    (for PWA)
   frontend/public/logo512.png    (for PWA)
   ```

---

## Testing Your Logo

1. **Start the development server:**
   ```bash
   cd frontend
   npm start
   ```

2. **Check the header** - Your Fordham logo should appear in the top-left

3. **Responsive check** - Logo should scale properly on mobile devices

---

## Troubleshooting

**Logo not showing?**
- ✅ Check file is named exactly: `fordham-logo.png`
- ✅ Check file is in `frontend/public/` directory
- ✅ Clear browser cache and refresh (Cmd+Shift+R / Ctrl+Shift+R)
- ✅ Check browser console for errors

**Logo too big/small?**
- Edit `frontend/src/styles/Header.css`
- Adjust `.fordham-logo { height: 50px; }` to your preference

**Wrong colors?**
- All Fordham maroon colors are already set in:
  - `frontend/src/styles/index.css` (color variables)

---

## Contact for Official Assets

For official Fordham branding materials:

**Office of Communications and Public Affairs**
- Website: fordham.edu
- Email: [communications office email]
- They can provide:
  - Official logos in various formats
  - Brand guidelines
  - Color specifications
  - Approved usage examples

---

## Current Status

✅ **Colors**: Fordham maroon (#8B2332) and white applied throughout
✅ **Logo placeholder**: Ready in header with fallback icon
⏳ **Logo file**: Waiting for you to add `fordham-logo.png`

Once you add the logo file, refresh the page and it will appear automatically! 🎓

