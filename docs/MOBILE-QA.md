# Mobile workflow review

## FairFare campaign and warmer feedback

The home rail now loops five campaign images across both ends and accepts swipes, taps and keyboard input without visible pagination controls. The phone first view includes the square camera, gallery and Jaipur card. Privacy is at the page footer and is still reachable from More. The site header is diagonal saffron, ivory and green, with one active-tab colour.

The visit stack includes five monuments and Jawahar Kala Kendra. Three destinations use the existing ticket endpoint. The cards for [Hawa Mahal](https://www.tourism.rajasthan.gov.in/hawa-mahal.html), [Jantar Mantar](https://www.tourism.rajasthan.gov.in/jantar-mantar.html) and [Amber Palace](https://www.tourism.rajasthan.gov.in/content/rajasthan-tourism/en/tourist-destinations/amber-palace.html) link to Rajasthan Tourism and direct visitors to confirm current rates at the entrance. Verify the stack in both directions and check that the existing rates retain their visitor-category selection.

The browser checks also exercise the Jaipur completion stamp, animated checklist fill and price reveal. Reports and screenshots are under `.local/warm-<width>x<height>/` and `.local/warm-live-<width>x<height>/`. Photo identification and contribution writes use intercepted responses. Native camera and installed PWA checks require a phone.

## Shared swipe, home scan and trip guides

Home leads with a loop of three logo-inspired images, followed by the camera and gallery controls, the Jaipur pilot and product scope, and the Hawa Mahal tips card. At 375 × 812 the two photo controls end at y=520, and the tips card ends at y=741 above the bottom bar. Confirming a photo or returning from a comparison brings the product form into view on Home. Existing direct scan links continue to work.

The browser suite exercises left and right swipes, tap, keyboard, a cancelled short swipe, autoplay, pause and reduced motion. A separate vertical touch test over the monument card scrolled 413 px while leaving the selected card unchanged. The visitor category stays in place across card changes. The initial visitor selector and official ticket link fit at 375 × 812. Sources and guide details expand below the deck.

On both fare pages the mode selector has the same active colour. The first screen shows the selector and the pre-ride checklist. Practice scenarios, extra tips and the local fare calculator are available by scrolling. The More menu makes the four information pages available with a highlighted route. The contributor landing and existing submission receipts are accessible from the primary navigation.

The 375 × 812 review was followed by 390 × 844 and 1440 × 900. Screenshot and hit-test reports are under `.local/unified-<width>x<height>/` and `.local/unified-live-<width>x<height>/`. The browser suite uses real public comparison and ticket reads and intercepts photo identification and contribution writes. Device camera capture and installation are phone checks.

## Colour, swipe and submission feedback

Reviewed 375 × 812 first, then 390 × 844 and 1440 × 900. All 14 browser workflow groups passed at each size. The suite hit-tested controls in 27 captured states per viewport and checked every direct route in both themes. At 375 × 812, the Jaipur tips and Scan buttons end at y=470 and y=566. The first card and its fare link fit in the open dialog. The submission action, review checkbox and receipt action also fit without scrolling. Comparison and reference details still extend when opened.

The flashcard check drags the front card before release, cancels a short drag, swipes past the threshold, taps the revealed card, advances with Enter, goes back a card, finishes with reduced motion, replays, and closes with Escape. It also captures the stack in dark mode. The contribution check delays an intercepted response to verify the sending state, then verifies the receipt stamp after the response. Identification and submission are intercepted during these runs. Fare references use the live read paths. Device camera and installed PWA behaviour remain device checks.

Screenshots and reports are under `.local/lively-375x812/`, `.local/lively-390x844/` and `.local/lively-1440x900/`. The home inspector measured a 24 px title before and a 26 px title after at 375 px, with one additional locally hosted photograph. It reported no errors. Its remaining warning is for the existing warm white brand canvas.

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
