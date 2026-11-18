SHAUNA LANE / TERRA COTTA TUTORING — DESIGN REVIEW

The site now presents two linked experiences:

1. Magazine Precision (`index.html`)
   - The main entertainment brand homepage uses the editorial design.
   - The former homepage design toggle now links to Terra Cotta Tutoring.

2. Warm Collage (`tutoring.html`)
   - Terra Cotta Tutoring uses the Warm Collage visual style and education-focused content.
   - The client-supplied tutoring photos are in `assets/`.
   - The header and floating switcher link back to Magazine Precision.

The tutoring page includes ENL, ELA, literacy, performance coaching, teaching approach,
qualifications, testimonials and an email enquiry link. Social links are reserved for later.

The current links use `index.html` and `tutoring.html` so the review works locally. A hosting
provider must map the second domain to `tutoring.html` during deployment; the ZIP does not
configure domain or DNS settings.

DEPLOYMENT CHECK

Extract the ZIP and publish the contents of `shauna-lane-redesign-main` together. The hosting
document root must contain `index.html`, `tutoring.html`, `style.css`, `warm-collage.css`,
`tutoring-collage.css`, and the complete `assets` folder side by side. Do not upload only the
HTML/CSS files or rename the `assets` folder. Use `/tutoring.html` for the tutoring page unless
the host is explicitly configured to serve that file at the tutoring domain root.
