# Mobile workflow review

## Jaipur guide and contribution receipts

The home carousel explains the Jaipur demo. Get Ready for Jaipur opens seven browsable tip cards and sits above Scan on mobile. The capture tile and gallery button are taller. The ordered menu links to Your Contributions, the installation guide, privacy, About FairFare and the illustrated motivation story. Results identify the selling setting and show a suggested opening offer with an explanation that actual discounts vary.

Browser checks cover the carousel, flashcards, bargaining, device history after a reload and clearing it, international payment advice, the fare calculator, the Maps link and the existing scan and submission workflows. The receipt list stores only short receipts for new reports made here. Earlier anonymous submissions cannot be associated with this browser.

The distance calculator transcribes the [15 July 2013 auto order](https://transport.rajasthan.gov.in/content/dam/transport/transport-dept/pdf/Fares/O_15.07.2013.pdf) and the [5 April 2013 Jaipur prepaid taxi order](https://transport.rajasthan.gov.in/content/dam/transport/transport-dept/pdf/Fares/O_05.04.2013.pdf). Date and scope appear with the estimates. The [Uber airport route](https://www.uber.com/global/en/r/routes/jai-to-jaipur-rajasthan-in/) and [PinkCityTours rates](https://www.pinkcitytours.com/taxi-service-in-jaipur/) provide separately identified commercial examples. A current city-wide tariff could not be confirmed in the Transport Department index.

## Bangles, ticket prices and Back navigation

The follow-up passed 12 browser workflow groups at 375 × 812, 390 × 844 and 1440 × 900. It checks that inferred elephant finish stays in Edit product details, bangle confirmation asks for inner diameter and quantity, and an unset material shows separate ranges. It also checks bangle submission quantity, hosted images, live prices, the international student tier, and Back following price → edit details → home after multiple price checks.

The read-only data check passed 4,185 bangle combinations and the existing 20,232 elephant combinations. Each bangle range has at least three compatible records. A live OpenRouter retest identified the patterned bangle illustration and left material unknown. A labelled live bangle submission retained its six-piece quantity in pending review before being rejected as QA. All three ticket cards returned fresh official data. Test screenshots are in `.local/bangles-375x812/`, `.local/bangles-390x844/` and `.local/bangles-1440x900/`.

Reviewed 375 × 812 first, from the opening screen through results and submissions. Then ran the same browser checks at 390 × 844 and 1440 × 900.

| Workflow | Issue at 375 × 812 before | Verified behavior |
| --- | --- | --- |
| Home and scanning | Home repeated the bottom navigation. Scan put a decorative viewfinder above its camera action, and manual entry expanded beneath it. | The camera tile opens the camera picker. Gallery and manual entry are secondary. Choosing manual entry replaces the empty photo picker on mobile. |
| Photo confirmation | Product title and explanatory copy repeated above the three fields. The price action followed the form. | One title, a compact photo, height, finish and selling setting. Product, material and carving edits open on request. See price stays in the bottom action bar. |
| Results and buying | The comparison panel repeated the demo caveat and the reporting action scrolled with the page. | One range and record-count label. Listing, matching, source and quote details start closed. Sharing the price stays visible even while the comparison list is open. |
| Purchase and contributor | The review action and required accuracy checkbox were below the first screen. | Three purchase steps and five contributor steps. The review summary and accuracy control fit on the first screen. Back and Continue share the bottom bar. Price source and date are editable in a disclosure. |
| Autos and app taxis | Auto mode, repeated fare copy and the note form pushed Make a ride note below the first screen. | The fare status, mode choice, two fields and note action fit. Tips and source details open on request. Taxi payment and booking checklist remain available. |
| Monuments | Only the first destination was visible on a phone. | Compact thumbnail rows show all three names, fee statuses and official ticket links at 375 × 812. |

All three viewport runs passed 11 workflow groups, with 20 captured states checking the primary action from the initial viewport. The checks hit-test each specified control to catch fixed bars covering it. On phones those controls are at least 44 px tall. All 11 direct routes fit in both themes. The service worker opened the shell offline. The browser suites intercepted four identification requests and two submissions per run. Price calculations and reference images used the live public Supabase records.

The longest initial states on 375 × 812 are identification recovery and monuments. Identification recovery shows the retry, the three essential fields and See price. Its optional product edits sit just below the action bar. Monuments show the three ticket links with the guide disclosure farther down. Expanding all comparable listings or optional details naturally extends the page. Phone screenshots and browser reports are generated under `.local/browser-<width>x<height>/`.

The browser checks use phone-sized viewports. Camera hardware, provider recognition, native keyboard behavior and installed PWA behavior still need a real phone check.
