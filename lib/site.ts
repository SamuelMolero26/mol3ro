/* Single source of truth for identity. Everything below matches
   Samuel_Molero_SWE_Resume.pdf — do not hardcode these anywhere else. */

export const NAME = "Samuel Molero";
export const EMAIL = "samuelmolero63@gmail.com";
export const PHONE = "210-876-8762";
export const LINKEDIN = "https://www.linkedin.com/in/samuel-molero/";

export const DOMAIN = "mol3ro.com";

export const GITHUB_USER = "SamuelMolero26";
export const GITHUB_URL = `https://github.com/${GITHUB_USER}`;

export const LOCATION = "College Station, TX";
export const SCHOOL = "Texas A&M University";
export const GRADUATION = "December 2026";
export const ROLE = "Software Engineer";
/* Backend & full-stack, per the resume's experience section. */
export const FOCUS = "Backend & Full-Stack";

/* Served from public/. Both the desktop window and the handset tab read this. */
export const RESUME_URL = "/Samuel_Molero_SWE_Resume.pdf";
/* First page rendered at build time so mobile shows the resume without
   relying on in-iframe PDF rendering, which iOS Safari does not do. */
export const RESUME_PREVIEW_URL = "/resume-preview.png";
