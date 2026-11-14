# KITRO — PITCH VIDEO ASSET MANIFEST & SKILL STATUS
**Document Classification:** Hackathon Pitch Video Production Brief  
**Platform Version:** 0.1.0-testnet  
**Official Repository:** `https://github.com/heyrapto/kitro`  
**Video Output Directory:** `docs/video/`

---

## 1. ANTIGRAVITY "BRAG" SKILL AUDIT & AVAILABILITY REPORT

In accordance with Part 7 of the Hackathon Directive, an exhaustive search for the **Brag** pitch video creation skill was conducted across:
1. **Agent Marketplace Catalog:** Searched for `brag`, `pitch video`, and `video`. The marketplace returned no entry matching `brag` (the only video plugin is `invideo` by InVideo, which requires external user account connection).
2. **Local Environment Customizations:** Searched `C:\Users\USER\.gemini\config\skills`. No `brag` skill is installed.
3. **Builtin Antigravity Skills:** Searched `C:\Users\USER\.gemini\antigravity\builtin\skills`. No `brag` skill is present.
4. **Global Filesystem Search:** Recursively inspected `C:\Users\USER\.gemini` for any folder or file named `*brag*`. Zero matches found.

### Official Skill Disclosure
> *"The skill named 'Brag' (or any built-in automated hackathon video-rendering skill) is not installed in the Antigravity environment or available in the marketplace catalog."*

To ensure full compliance without fabricating an AI-generated MP4 or making false claims, complete broadcast-ready production assets have been authored and checked into `docs/video/`:
- **Full Video Script (75s):** `docs/video/PITCH_VIDEO_SCRIPT.md`
- **Scene-by-Scene Visual Storyboard:** `docs/video/STORYBOARD.md`
- **Closed Captions / Subtitles:** `docs/video/captions.srt`
- **Production Asset Manifest:** `docs/video/ASSET_MANIFEST.md`

---

## 2. SCENE FOOTAGE & ASSET BREAKDOWN

| Scene | Duration | Asset File / Source | Real Product vs Illustrative Motion |
| :---: | :---: | :--- | :--- |
| **01** | `00:00 - 00:06` | Title Card: Typography overlay | Illustrative Motion Graphic |
| **02** | `00:06 - 00:12` | Agent Prompt Injection & Risk | Illustrative Graphic |
| **03** | `00:12 - 00:18` | The Autonomous Bottleneck Dilemma | Illustrative Graphic |
| **04** | `00:18 - 00:24` | Core Product Principle Card | Typography / Branding |
| **05** | `00:24 - 00:32` | 3-Tier Separation Architecture | Animated Architecture Diagram |
| **06** | `00:32 - 00:44` | `/dashboard/invoices` AI extraction | **Real Product UI Capture** |
| **07** | `00:44 - 00:54` | Policy ALLOW & XRPL Testnet Settlement | **Real Product UI & Ledger Explorer** (`630D1C8B...`) |
| **08** | `00:54 - 01:04` | Policy REFUSE & `tefBAD_QUORUM` Rejection | **Real Product UI & On-Ledger Error** |
| **09** | `01:04 - 01:15` | Kitro Wordmark & GitHub Link | Branding & Typography |

---

## 3. RENDERING INSTRUCTIONS

If you have an external video creation pipeline (such as Remotion, InVideo, Screenflow, or After Effects):
1. Import `docs/video/captions.srt` for automatic subtitle timing.
2. Follow `docs/video/STORYBOARD.md` for visual cues and transition triggers.
3. Record live screen captures directly from your local dashboard running at `http://localhost:3000`.
4. Export the final rendering to `docs/video/kitro_pitch_75s.mp4`.
