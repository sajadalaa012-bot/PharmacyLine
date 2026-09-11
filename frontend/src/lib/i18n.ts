// Bilingual dictionary (English + Arabic) for the storefront and back office.
//
// The English map is the source of truth: its keys type every lookup, so a
// missing Arabic string is a compile error rather than a blank label.
// Placeholders are written {like_this} and filled by `format`.
//
// Framework-free on purpose - the server layout, client components, and the
// plain-module data layer (lib/api.ts) all import from here.

export type Lang = "en" | "ar";

export const LANGS: readonly Lang[] = ["en", "ar"];

/** Cookie + localStorage key holding the reader's choice. */
export const LANG_KEY = "lang";

/** Writing direction for a language. */
export function dirOf(lang: Lang): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}

/** Narrow an untrusted string (cookie value, storage value) to a Lang. */
export function toLang(value: string | null | undefined): Lang | null {
  return value === "en" || value === "ar" ? value : null;
}

/**
 * The shop's own language. Customers here read Arabic, so that is what a
 * first visit gets - not whatever the browser happens to ask for. English is
 * one tap away on the toggle, and the choice is remembered from then on.
 */
export const DEFAULT_LANG: Lang = "ar";

// ── Dictionaries ────────────────────────────────────────────────────

const en = {
  // ── Shared vocabulary ──
  "common.cart": "Cart",
  "common.orders": "Orders",
  "common.item": "item",
  "common.items": "items",
  "common.itemsCount": "{n} items",
  "common.total": "Total",
  "common.subtotal": "Subtotal",
  "common.discount": "Discount",
  "common.notes": "Notes",
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.add": "Add",
  "common.close": "Close",
  "common.search": "Search",
  "common.clear": "Clear",
  "common.retry": "Retry",
  "common.saving": "Saving…",
  "common.sure": "Sure?",
  "common.back": "Back",
  "common.all": "All",
  "common.pending": "Pending",
  "common.approved": "Approved",
  "common.bonus": "Bonus",
  "common.currency": "IQD",
  "common.clickAgain": "Click again to confirm",
  "common.tapAgain": "Tap again to confirm",
  "common.clearSearch": "Clear search",
  "common.brand": "velina",

  // ── Language toggle ──
  "lang.switchTo": "Switch to Arabic",
  "lang.label": "العربية",

  // ── Theme toggle ──
  "theme.toLight": "Switch to light mode",
  "theme.toDark": "Switch to dark mode",
  "theme.light": "Light mode",
  "theme.dark": "Dark mode",

  // ── Storefront ──
  "shop.loading": "Opening the shop…",
  "shop.loadFailed": "The shop could not load",
  "shop.searchPlaceholder": "Search products or code…",
  "shop.searchAria": "Search products",
  "shop.store": "Store",
  "shop.home": "Home",
  "shop.openCart": "Open cart",
  "shop.closeCart": "Close cart",
  "shop.allProducts": "All products",
  "shop.products": "Products",
  "shop.eyebrow": "Skincare",
  "shop.headline1": "Everyday wellness,",
  "shop.headline2": "thoughtfully curated.",
  "shop.lede":
    "A considered edit of trusted skincare essentials - browse the collection and build your order in a few taps.",
  "shop.ctaShop": "Shop the collection",
  "shop.ctaBrowse": "Browse categories",
  "shop.price": "Price",
  "shop.min": "Min",
  "shop.max": "Max",
  "shop.minWith": "Min {n}",
  "shop.maxWith": "Max {n}",
  "shop.minAria": "Minimum price",
  "shop.maxAria": "Maximum price",
  "shop.noMatch": "Nothing matches “{q}”",
  "shop.noInRange": "No products in this price range",
  "shop.noneYet": "No products here yet",
  "shop.tryAnother": "Try a different search or category",
  "shop.tryWiden": "Try widening the price range or clearing the filter",
  "shop.addFromAdmin": "Add products from the Admin dashboard",
  "shop.footerBlurb":
    "Skincare and wellness essentials - curated and delivered.",
  "shop.copyright":
    "© 2026 velina - فيلينا. All rights reserved.",
  "shop.featured": "Featured",
  "shop.goodToSeeYou": "Welcome back",

  // ── Install to home screen ──
  "app.installTitle": "Install the app",
  "app.installBody": "Add velina to your home screen - full screen, one tap away.",
  "app.installIos": "Tap the Share button, then “Add to Home Screen”.",
  "app.install": "Install",
  "app.notNow": "Not now",
  "app.updateReady": "A new version is ready",
  "app.refresh": "Refresh",
  "app.offline": "No connection. Showing the last catalogue seen.",

  // ── Finder: search and filters, above the grid ──
  "finder.filters": "Filters",

  // ── Notifications a shopper can turn on for their own order ──
  "notify.title": "Tell me when it is ready",
  "notify.body":
    "One notification to this device, the moment the shop approves your order.",
  "notify.turnOn": "Notify me",
  "notify.on": "Notifications are on for this order",
  "notify.blocked":
    "Notifications are switched off for this site in your browser settings.",
  "notify.failed": "Notifications could not be turned on. Try again.",
  "notify.working": "Turning on…",

  // ── Product card & detail ──
  "product.addToCart": "Add to Cart",
  "product.viewDetails": "View details for {name}",
  "product.removeOne": "Remove one {name}",
  "product.addOne": "Add one {name}",
  "product.remove": "Remove {name}",
  "product.addAria": "Add {name}",
  "product.addBonus": "Add {name} as bonus",
  "product.inCart": "{n} in cart",
  "product.magnify": "Magnify",
  "product.magnifyAria": "Magnify product photo",
  "product.benefits": "Benefits",
  "product.ingredients": "Ingredients",
  "product.howToUse": "How to use",
  "product.noDetails": "No extra details for this product yet.",
  "product.zoomIn": "Zoom in",
  "product.zoomOut": "Zoom out",
  "product.closeViewer": "Close viewer",
  "product.zoomHint": "Scroll or pinch to zoom · drag to pan · double-tap to reset",

  // ── Cart ──
  "cart.title": "Order",
  "cart.empty": "Nothing here yet",
  "cart.emptyHint": "Add products to build the order",
  "cart.removeFromOrder": "Remove {name} from order",
  "cart.discountPercent": "Discount %",
  "cart.notesPlaceholder": "Special instructions…",
  "cart.discountWith": "Discount ({n}%)",
  "cart.placeOrder": "Place Order",
  // ── Checkout details ──
  "checkout.name": "Full name",
  "checkout.phone": "Phone number",
  "checkout.phonePlaceholder": "07XX XXX XXXX",
  "checkout.location": "Delivery location",
  "checkout.locationPlaceholder": "Area, street, nearest landmark…",
  "checkout.required": "Add your name, phone, and delivery location to place the order.",
  "checkout.continue": "Continue",
  "checkout.details": "Delivery details",
  "checkout.detailsHint": "Where should we send this order, and who should we ask for?",
  "checkout.stepTwo": "Step 2 of 2",
  "checkout.backToOrder": "Back to the order",
  "checkout.customer": "Customer",
  "checkout.noDetails": "No delivery details on this order",
  "checkout.openInMaps": "Open in Maps",
  "cart.generateReceipt": "Generate Receipt",
  "cart.approveOrder": "Approve Order",
  "cart.checkout": "Checkout",

  // ── Order confirmation ──
  "confirm.title": "Order received",
  "confirm.subtitle": "We have received your order - we will confirm it shortly",
  "confirm.order": "Order",
  "confirm.items": "Items",
  "confirm.note": "The pharmacy will review your order and confirm it shortly.",
  "confirm.continue": "Continue Shopping",

  // ── Receipt ──
  "receipt.eyebrow": "Medical · Skincare · Supplements",
  "receipt.pendingBadge": "Pending approval",
  "receipt.item": "Item",
  "receipt.amount": "Amount",
  "receipt.grandTotal": "Grand total",
  "receipt.pendingFooter":
    "- We received your order and will confirm it shortly -",
  "receipt.thanks": "- Thank you for your purchase -",
  "receipt.print": "Print",
  "receipt.saveImage": "Save Image",
  "receipt.whatsapp": "Send via WhatsApp",
  "receipt.backToShop": "Back to shop",
  "receipt.newOrder": "New order",
  "receipt.backToOrders": "Back to orders",
  "receipt.saveFailed":
    "Couldn't save the image on this device - please take a screenshot of the receipt instead.",
  "receipt.renderFailed": "Could not render the receipt.",

  // ── Sign in ──
  "auth.title": "Admin sign in",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.emailPlaceholder": "you@example.com",
  "auth.passwordPlaceholder": "Enter password",
  "auth.signIn": "Sign in",
  "auth.signingIn": "Signing in…",
  "auth.failed": "Login failed.",
  "auth.expired": "Session expired. Please sign in again.",
  "auth.signOut": "Sign out",
  "auth.defaultCredentials":
    "No admin credentials are configured on this host, so the built-in defaults are in force - and those are public in the source. Set ADMIN_EMAIL and ADMIN_PASSWORD in your hosting environment.",

  // ── Admin shell ──
  "nav.overview": "Overview",
  "nav.newSale": "New sale",
  "nav.products": "Products",
  "nav.categories": "Categories",
  "nav.orders": "Orders",
  "nav.consultations": "Consultations",
  "nav.backOffice": "Back office",
  "nav.storefront": "Storefront",
  "nav.openMenu": "Open menu",
  "nav.closeMenu": "Close menu",

  // ── Admin overview ──
  "overview.title": "Overview",
  "overview.subtitle": "Catalog and sales at a glance",
  "overview.totalSales": "Total sales",
  "overview.approvedOrders": "approved orders",
  "overview.pendingApproval": "{n} pending approval",
  "overview.allApproved": "all approved",
  "overview.inCatalog": "in catalog",
  "overview.active": "active",
  "overview.topProducts": "Top products by revenue",
  "overview.noSales": "No sales recorded yet",
  "overview.recentOrders": "Recent orders",
  "overview.viewAll": "View all",
  "overview.noOrders": "No orders registered yet",
  "overview.discountSuffix": "discount",

  // ── Admin products ──
  "products.subtitle": "{p} products across {c} categories",
  "products.addProduct": "Add product",
  "products.searchPlaceholder": "Search name or code…",
  "products.filterByCategory": "Filter by category",
  "products.allCategories": "All categories",
  "products.noMatching": "No matching products",
  "products.editProduct": "Edit product",
  "products.deleteProduct": "Delete product",
  "products.colCode": "Code",
  "products.colProduct": "Product",
  "products.colCategory": "Category",
  "products.colPrice": "Price",
  "products.colStock": "Stock",
  "products.colActions": "Actions",

  // ── Stock ──
  "stock.label": "Stock",
  "stock.edit": "Set stock for {name}",
  "stock.untracked": "Not tracked",
  "stock.untrackedHint":
    "This product is always purchasable. Set a number to start counting it.",
  "stock.inStock": "{n} in stock",
  "stock.outOfStock": "Out of stock",
  "stock.left": "Only {n} left",
  "stock.decrease": "Decrease stock",
  "stock.increase": "Increase stock",
  "stock.stopTracking": "Stop tracking",
  "stock.saveFailed": "Could not save the stock level.",
  "stock.lowFilter": "Low or out of stock",
  "stock.variantHint":
    "The fallback for any option that doesn't set a stock level of its own.",

  // ── Push notifications (back office) ──
  "nav.notifications": "Notifications",
  "push.title": "Phone notifications",
  "push.subtitle":
    "Alert this device the moment an order is placed, even with the app closed.",
  "push.step1": "1. Turn the service on",
  "push.step2": "2. This device",
  "push.keysMissing":
    "The shop has no notification keys yet. Creating a pair turns the service on for every device.",
  "push.keysReady": "The notification service is on.",
  "push.on": "On",
  "push.off": "Off",
  "push.fromEnv":
    "The keys are set in this deployment's environment, so they cannot be changed here.",
  "push.generate": "Create keys",
  "push.clearKeys": "Remove keys",
  "push.clearWarn": "Removing the keys stops every device from being alerted.",
  "push.listening": "{n} devices are listening",
  "push.listeningOne": "1 device is listening",
  "push.listeningNone": "No device is listening yet",
  "push.deviceOn": "This device is listening",
  "push.deviceOff": "This device is not listening",
  "push.turnOn": "Alert this device",
  "push.turnOff": "Stop alerts here",
  "push.test": "Send a test",
  "push.testSent": "Sent. It should arrive in a moment.",
  "push.blocked":
    "Notifications are switched off for this site in your browser settings. Turn them back on there first.",
  "push.unsupported":
    "This browser cannot show notifications. On an iPhone, install the app to the home screen first.",
  "push.keysNeeded": "Create the keys above before turning this device on.",

  // ── Telegram ──
  "nav.telegram": "Telegram",
  "tg.title": "Telegram notifications",
  "tg.subtitle":
    "Send every order to a Telegram chat the moment it is placed.",
  "tg.step1": "1. The bot",
  "tg.step2": "2. Where orders go",
  "tg.step3": "3. Destinations",
  "tg.connected": "Connected",
  "tg.notConnected": "Not connected",
  "tg.connectedTo": "Connected to",
  "tg.fromEnv":
    "The token is set by TELEGRAM_BOT_TOKEN in this app's environment variables. Change it there.",
  "tg.tokenLabel": "Bot token",
  "tg.tokenHint":
    "From @BotFather on Telegram. It is stored server-side and never shown again.",
  "tg.tokenSaved": "Bot token saved.",
  "tg.step2Hint":
    "A bot cannot message you first. Open Telegram, send any message to @{bot} - or add it to a group and send one there - then press Find chats.",
  "tg.findChats": "Find chats",
  "tg.added": "Added",
  "tg.noneFound":
    "No chats yet. Send a message to the bot in Telegram, then try again.",
  "tg.chatIdPlaceholder": "Or paste a chat ID",
  "tg.addManually": "Add",
  "tg.noChats": "No destinations yet - orders are not being sent anywhere.",
  "tg.removeChat": "Remove this destination",
  "tg.live": "Sending",
  "tg.notLive": "Not sending",
  "tg.sendTest": "Send a test message",
  "tg.testSent": "Test message sent. Check Telegram.",
  "tg.whatGetsSent":
    "Every new order is sent with its items, options, totals, and the customer's name, phone and a map link. Orders you edit or approve later are not re-sent.",
  "tg.loadFailed": "Could not load the Telegram settings.",
  "tg.actionFailed": "That did not work. Please try again.",

  // ── Options (sizes, flavours, shades) ──
  "variants.title": "Options (optional)",
  "variants.hint":
    "Sizes, flavours, shades - anything the same product comes in. Add them and shoppers pick one before adding to the cart. Leave the price, offer and stock blank on an option and it uses the product's own.",
  "variants.emptyHint":
    "No options - this product is sold as itself, at the price above.",
  "variants.addOption": "Add an option",
  "variants.removeOption": "Remove this option",
  "variants.moveUp": "Move up",
  "variants.moveDown": "Move down",
  "variants.name": "Option",
  "variants.nameAr": "Option (Arabic)",
  "variants.namePlaceholder": "e.g. 100 ml",
  "variants.nameArPlaceholder": "e.g. ١٠٠ مل",
  "variants.codeSuffix": "Code",
  "variants.codePlaceholder": "100ML",
  "variants.price": "Price",
  "variants.oldPrice": "Old price",
  "variants.inherits": "Same as above",
  "variants.chooseLabel": "Choose an option",
  "variants.chooseAria": "Choose an option for {name}",

  // ── The discount ad ──
  "promo.eyebrow": "Off selected items",
  "promo.title": "Discounts up to {n}%!",
  "promo.body":
    "Selected products are on offer right now - while stocks last.",
  "promo.cta": "Shop the offers",
  "promo.later": "Maybe later",
  "promo.onOffer": "On offer",

  // ── Browse (the filter page: category + brand) ──
  "browse.title": "Browse",
  "browse.category": "Category",
  "browse.brand": "Brand",
  "browse.all": "All",
  "browse.clearAll": "Clear all",
  "browse.showResults": "Show {n} products",
  "browse.showResultsOne": "Show 1 product",
  "browse.noCategories": "No categories yet.",
  "browse.filtersActive": "{n} filters",
  "browse.uncategorised": "Uncategorised",

  // ── Offers (a product with an old price above its current one) ──
  "offer.percentOff": "−{n}%",
  "offer.youSave": "You save {n} {currency}",

  // ── Home deck (the slideshow that opens the home screen) ──
  "home.deck": "Highlights",
  "home.slideOf": "Slide {n} of {total}",
  "home.prev": "Previous slide",
  "home.next": "Next slide",
  "home.goTo": "Go to slide {n}",
  "home.viewProduct": "View product",
  "home.slideDetails": "Read more about this",
  "home.seeAll": "See all",

  // ── Skincare consultation (the home screen's enquiry form) ──
  "consult.eyebrow": "Free skincare consultation",
  "consult.title": "Not sure where to start?",
  "consult.inviteBody":
    "Tell us about your skin and we will suggest a routine - free, and no obligation.",
  "consult.body":
    "Tell us about your skin and leave your number. Someone from the shop will reach you with a routine picked for you - no charge, no obligation.",
  "consult.name": "Your name",
  "consult.namePlaceholder": "e.g. Zainab",
  "consult.phone": "Phone number",
  "consult.phonePlaceholder": "07XX XXX XXXX",
  "consult.age": "Age",
  "consult.agePlaceholder": "Optional",
  "consult.gender": "Gender",
  "consult.genderFemale": "Female",
  "consult.genderMale": "Male",
  "consult.city": "City or area",
  "consult.cityPlaceholder": "Optional - e.g. Baghdad, Karrada",
  "consult.routine": "What do you use now?",
  "consult.routinePlaceholder":
    "Optional - cleanser, cream, sunscreen, anything you are already on",
  "consult.allergies": "Allergies, sensitivities or medication",
  "consult.allergiesPlaceholder":
    "Optional - anything that has irritated your skin, or treatment you are taking",
  "consult.budget": "Budget in mind",
  "consult.budgetPlaceholder": "Optional",
  "consult.pregnancy": "Pregnant or breastfeeding?",
  "consult.pregnant": "Pregnant",
  "consult.breastfeeding": "Breastfeeding",
  "consult.pregnancyNeither": "Neither",
  "consult.photo": "A photo of your skin",
  "consult.photoHint":
    "Optional. In daylight, no makeup, straight on - it helps more than any description.",
  "consult.photoAdd": "Add a photo",
  "consult.photoReplace": "Choose another",
  "consult.photoRemove": "Remove the photo",
  "consult.photoUploading": "Adding…",
  "consult.optional": "Optional",
  "consult.skinType": "Your skin type",
  "consult.skinNormal": "Normal",
  "consult.skinDry": "Dry",
  "consult.skinOily": "Oily",
  "consult.skinCombination": "Combination",
  "consult.skinSensitive": "Sensitive",
  "consult.concerns": "What would you like help with?",
  "consult.concernAcne": "Acne & breakouts",
  "consult.concernDarkSpots": "Dark spots",
  "consult.concernAgeing": "Fine lines",
  "consult.concernDryness": "Dryness",
  "consult.concernSensitivity": "Redness & sensitivity",
  "consult.concernPores": "Large pores",
  "consult.concernSunDamage": "Sun damage",
  "consult.notes": "Anything else we should know?",
  "consult.notesPlaceholder":
    "What you use now, anything that has irritated your skin, what you are hoping for…",
  "consult.submit": "Request a consultation",
  "consult.sending": "Sending…",
  "consult.required": "Name, phone and skin type are needed.",
  "consult.sentTitle": "Thank you - we have your request",
  "consult.sentBody":
    "Someone from the shop will reach you on the number you gave. If you asked outside opening hours, expect to hear from us the next working day.",
  "consult.sendAnother": "Send another request",
  "consult.filterWaiting": "Waiting ({n})",
  "consult.filterAll": "All",
  "consult.waiting": "Waiting",
  "consult.done": "Done",
  "consult.markDone": "Mark handled",
  "consult.reopen": "Reopen",
  "consult.whatsapp": "WhatsApp",
  "consult.waMessage":
    "Hello {name}, this is velina - you asked us for a skincare consultation.",
  "consult.noneWaiting": "Nothing waiting. Every request has been handled.",
  "consult.noneYet": "No consultation requests yet.",
  "home.statProducts": "Products",
  "home.statBrands": "Brands",
  "home.statCategories": "Categories",

  // ── Packages ──
  // A set of products sold together for one price. Storefront first, then
  // the back office where they are put together and priced.
  // ── The home slideshow (back office) ──
  "nav.homeSlides": "Home slides",
  "deck.subtitle":
    "The slideshow the home screen opens with. Packages bring their own slides; these are the two that do not.",
  "deck.blankHint":
    "Every box is optional. Leave one blank and the slide keeps the wording the shop already uses, in both languages.",
  "photo.replace": "Replace",
  "deck.photoWide": "Photo, desktop",
  "deck.photoWideHint": "Wide. Fills the slide on a computer or tablet.",
  "deck.photoMobile": "Photo, phone",
  "deck.photoMobileHint":
    "Taller, for narrow screens. Leave empty to use the desktop one everywhere.",
  "pkg.photoWide": "Photo, desktop",
  "pkg.photoWideHint": "Wide. Fills the slide on a computer or tablet.",
  "pkg.photoMobile": "Photo, phone",
  "pkg.photoMobileHint":
    "Taller, for narrow screens. Leave empty to use the desktop one everywhere.",
  "deck.photo": "Photo",
  "deck.photoHint":
    "Optional. With one, the picture fills the whole slide and the words sit on top of it - like a package. Without one, the words sit beside a row of product photos. A wide photo works best.",
  "deck.brief": "The brief",
  "deck.briefHint": "The first slide - what the shop is.",
  "deck.offer": "The discount ad",
  "deck.offerHint":
    "The last slide. It only appears while something is actually on offer.",
  "deck.packages": "Packages",
  "deck.packagesHint": "One slide each, between the two. Edited with the package itself.",
  "deck.eyebrow": "Small line above",
  "deck.eyebrowAr": "Small line, Arabic",
  "deck.headline": "Headline",
  "deck.headlineAr": "Headline, Arabic",
  "deck.headlineHint": "Press Enter for a line break. {n} is replaced by the discount figure.",
  "deck.body": "Sentence below",
  "deck.bodyAr": "Sentence below, Arabic",
  "deck.stats": "Show the counts",
  "deck.statsHint": "The product, brand and category totals under the sentence.",
  "deck.percent": "Discount figure",
  "deck.percentHint": "What the ad claims, here and in the popup. Written into {n}.",
  "deck.shown": "Shown",
  "deck.hiddenSlide": "Hidden",
  "deck.saved": "Saved",
  "deck.reset": "Reset",
  "deck.resetHint": "Clear every box back to the built-in wording. Save to apply.",

  "pkg.eyebrow": "Package",
  "pkg.whatsInside": "What's inside",
  "pkg.timesQty": "× {n}",
  "pkg.emptyNote": "Ask us what this package includes.",
  "pkg.viewDetails": "See what is in {name}",
  "pkg.photoHint":
    "Fills the whole slide on the home page, so a wide photo of the kit works best. Without one the slide shows the products inside instead.",
  "pkg.inCart": "{n} in your cart",
  "pkg.itemsCount": "{n} items",
  "pkg.oneItem": "1 item",
  "pkg.addToCart": "Add the package",
  "pkg.save": "Save {n}",

  // ── Packages (back office) ──
  "nav.packages": "Packages",
  "pkg.subtitle":
    "Put products together and sell them for one price. A package only reaches the storefront once you switch it on.",
  "pkg.new": "New package",
  "pkg.edit": "Edit package",
  "pkg.name": "Package name",
  "pkg.namePlaceholder": "e.g. Back to School",
  "pkg.nameAr": "Arabic name",
  "pkg.nameArPlaceholder": "العودة إلى المدرسة",
  "pkg.description": "A line about it",
  "pkg.descriptionPlaceholder": "Who it's for, in one sentence",
  "pkg.descriptionAr": "Arabic line",
  "pkg.contents": "What goes in",
  "pkg.contentsHint":
    "Pick products from the catalogue. Delete one later and it simply drops out of the package.",
  "pkg.addProduct": "Add a product",
  "pkg.pickProduct": "Choose a product…",
  "pkg.noContents": "Nothing in this package yet.",
  "pkg.removeItem": "Take out",
  "pkg.qtyAria": "How many of {name}",
  "pkg.separately": "Bought separately",
  "pkg.packagePrice": "Package price",
  "pkg.wasPrice": "Was price",
  "pkg.wasHint": "Shown struck through. Leave blank for no offer.",
  "pkg.useSeparately": "Use {n}",
  "pkg.saving": "The shopper saves {n} ({p}%)",
  "pkg.live": "On the storefront",
  "pkg.hidden": "Hidden",
  "pkg.showOnStorefront": "Show on the home page",
  "pkg.hiddenHint": "Switch on to put this package on the home page.",
  "pkg.noneYet": "No packages yet.",
  "pkg.noneYetHint": "Create one and it will show on the shop's home page.",
  "pkg.deletePackage": "Delete package",
  "pkg.moveUp": "Move up",
  "pkg.moveDown": "Move down",
  "pkg.needsPrice": "Needs a price",
  "pkg.needsItems": "Nothing in it yet",

  // ── Searchable dropdown ──
  "dropdown.search": "Search…",
  "dropdown.noResults": "No matches",

  // ── Product modal ──
  "modal.newProduct": "New product",
  "modal.editProduct": "Edit product",
  "modal.name": "Name",
  "modal.nameAr": "Name (Arabic)",
  "modal.code": "Code",
  "modal.priceIqd": "Price (IQD)",
  "modal.oldPriceIqd": "Old price (IQD) - optional",
  "modal.noOffer": "No offer",
  "modal.clearOffer": "Clear",
  "modal.oldPriceHint":
    "Leave blank for one price. Enter what it used to cost and shoppers see that struck through beside the price above.",
  "modal.offerPreview":
    "Shoppers see {old} struck through, then {price} {currency} - {n}% off.",
  "modal.brand": "Brand",
  "modal.brandAria": "Product brand",
  "modal.productCategory": "Category",
  "modal.productCategoryAria": "Product category",
  "modal.noCategory": "No category",
  "modal.productCategoryHint":
    "What kind of product this is. Shoppers filter by it alongside the brand.",
  "modal.photo": "Photo",
  "modal.preview": "Preview",
  "modal.removePhoto": "Remove photo",
  "modal.uploadPhoto": "Upload photo",
  "modal.uploading": "Uploading…",
  "modal.detailsTitle": "Details (optional)",
  "modal.detailsHint": "These show when a shopper opens the product.",
  "modal.arabicTitle": "Arabic content (optional)",
  "modal.arabicHint":
    "Shown to shoppers reading in Arabic. Anything left blank falls back to the English text.",
  "modal.description": "Description",
  "modal.benefits": "Benefits",
  "modal.ingredients": "Ingredients",
  "modal.howToUse": "How to use",
  "modal.namePlaceholder": "e.g. HAIR SKIN NAILS GUMMIES",
  "modal.nameArPlaceholder": "e.g. علكات الشعر والبشرة والأظافر",
  "modal.codePlaceholder": "e.g. F173",
  "modal.pricePlaceholder": "e.g. 21000",
  "modal.descriptionPlaceholder": "A short overview of the product…",
  "modal.benefitsPlaceholder": "What it helps with - one point per line…",
  "modal.ingredientsPlaceholder": "Active ingredients / composition…",
  "modal.usagePlaceholder": "Directions / dosage…",
  "modal.confirmDelete": "Confirm delete",
  "modal.saveChanges": "Save changes",

  // ── Admin categories ──
  "categories.subtitle": "Rename, reorder, and organize the catalog sections",
  "categories.newPlaceholder": "New category name (e.g. Lip Care)",
  "categories.newArPlaceholder": "Arabic name (optional)",
  "categories.arabicName": "Arabic name",
  "categories.moveUp": "Move up",
  "categories.moveDown": "Move down",
  "categories.rename": "Rename category",
  "categories.deleteCategory": "Delete category",
  "categories.saveName": "Save name",
  "categories.cancelRename": "Cancel rename",
  "categories.hasProducts":
    "Cannot delete “{name}” - it contains {n} products. Move or delete them first.",

  // ── Admin orders ──
  "orders.subtitle": "{n} orders · {money} approved sales",
  "orders.awaiting": "{n} awaiting approval",
  "orders.filterAll": "All ({n})",
  "orders.filterPending": "Pending ({n})",
  "orders.noPending": "No pending orders",
  "orders.noOrders": "No orders yet",
  "orders.noOrdersHint":
    "Orders placed from the storefront appear here for review",
  "orders.line": "line",
  "orders.lines": "lines",
  "orders.reviewEdit": "Review & Edit",
  "orders.approveAsIs": "Approve As-Is",
  "orders.approving": "Approving…",
  "orders.receipt": "Receipt",
  "orders.whatsapp": "WhatsApp",
  "orders.whatsappCustomer": "Send to customer",
  "orders.waGreeting": "Hello {name}, this is velina - about your order {no}.",
  "orders.waGreetingAnon": "Hello, this is velina - about your order {no}.",
  "orders.deletePermanently": "Delete permanently?",
  "orders.yesDelete": "Yes, delete",
  "orders.deleting": "Deleting…",

  // ── Admin sale screen ──
  "sell.reviewOrder": "Review order #{n}",
  "sell.reviewHint":
    "Adjust items, bonuses, and discount - saving approves the order",
  "sell.newHint": "Bonus items, price overrides, and discounts available",
  "sell.emptyCatalog": "No products in the catalog",


  // ── Data-layer errors ──
  "err.codeExists": "Product code '{code}' already exists.",
  "err.codeInUse": "Product code '{code}' is already in use.",
  "err.productMissing": "Product not found.",
  "err.categoryExists": "Category name '{name}' already exists.",
  "err.categoryMissing": "Category not found.",
  "err.categoryHasProducts": "Cannot delete category containing products.",
  "err.placeOrder": "Failed to place order.",
  "err.loadOrders": "Failed to load orders.",
  "err.loadOrder": "Failed to load order.",
  "err.updateOrder": "Failed to update order.",
  "err.deleteOrder": "Failed to delete order.",
  "err.lookupFailed": "Lookup failed.",
  "err.sendConsult": "Could not send the request.",
  "err.loadConsults": "Failed to load the consultation requests.",
  "err.updateConsult": "Failed to update the request.",
  "err.deleteConsult": "Failed to delete the request.",
  "err.packageNameRequired": "A package name is required.",
  "err.loadDeck": "Failed to load the home slides.",
  "err.saveDeck": "Failed to save the home slides.",
  "err.loadPackages": "Failed to load the packages.",
  "err.savePackage": "Failed to save the package.",
  "err.deletePackage": "Failed to delete the package.",
  "err.saveOrder": "Failed to save order: {reason}",
  "err.nameRequired": "Product name is required.",
  "err.codeRequired": "Product code is required.",
  "err.priceInvalid": "Price must be a valid positive number.",
  "err.oldPriceInvalid": "The old price must be a valid positive number.",
  "err.oldPriceTooLow":
    "The old price has to be higher than the price - otherwise there is no discount to show.",
  "err.variantNameRequired": "Every option needs a name.",
  "err.variantDuplicate": "Two options have the same name.",
  "err.variantOldPriceTooLow":
    "The old price for \"{name}\" has to be higher than what it sells for.",
  "err.categoryRequired": "Please select a category.",
  "err.uploadFailed": "Failed to upload image",
  "err.saveGeneric": "An error occurred while saving.",
  "err.deleteProduct": "Failed to delete product.",
  "err.loadProducts": "Failed to load products.",
  "err.saveProduct": "Failed to save product.",
  "err.saveCategory": "Failed to save category.",
  "err.deleteCategory": "Failed to delete category.",

  // ── The prize wheel ──
  "nav.wheel": "Prize wheel",
  "wheel.lede":
    "A wheel the customer spins once, right after they place an order. Write the prizes, then say which price range wins which of them: what they spent decides what they are playing for.",
  "wheel.enabled": "Run the wheel",
  "wheel.enabledHint":
    "While this is off nobody is offered a spin, and nothing below is lost.",
  "wheel.on": "Running",
  "wheel.off": "Off",
  "wheel.prizes": "Prizes",
  "wheel.prizesHint":
    "Everything that can be won. A prize reaches a wheel once a price range below ticks it.",
  "wheel.addPrize": "Add prize",
  "wheel.noPrizes": "No prizes yet. Add the first one to start building the wheel.",
  "wheel.name": "Prize",
  "wheel.nameAr": "Prize (Arabic)",
  "wheel.namePlaceholder": "Free delivery",
  "wheel.photo": "Photo",
  "wheel.untitled": "Untitled prize",
  "wheel.chance": "Chance",
  "wheel.chanceHint":
    "How likely this is next to the others on the same wheel. Equal numbers make an even wheel; 1 against 9 makes it one in ten. 0 keeps it on the wheel without ever letting it come up.",
  "wheel.ranges": "Price ranges",
  "wheel.rangesHint":
    "What an order of a given size is playing for. Where two ranges overlap, the one starting higher wins.",
  "wheel.addRange": "Add range",
  "wheel.noRanges": "No ranges yet. Add one to say what an order wins.",
  "wheel.prizesFirst": "Add a prize first: a range needs something to win.",
  "wheel.from": "From",
  "wheel.to": "To",
  "wheel.noCeiling": "and up",
  "wheel.badRange":
    "The upper bound is below the lower one, so nothing can land in this range.",
  "wheel.rangeWins": "Wins one of",
  "wheel.rangeEmpty": "Nothing ticked, so an order in this range gets no wheel.",
  "wheel.try": "Try a total",
  "wheel.tryHint":
    "Check what an order of any size would meet, without placing one.",
  "wheel.tryTotal": "Order total",
  "wheel.tryRange": "Range {from} to {to}",
  "wheel.tryRangeOpen": "Range {from} and up",
  "wheel.tryNoRange": "No range covers this total, so no wheel is offered.",
  "wheel.tryWhileOff":
    "Shown as if the wheel were running. It is switched off at the moment.",
  "wheel.wonLabel": "Prize",
  "wheel.title": "Spin the wheel",
  "wheel.subtitle": "Your order has earned one spin. Good luck.",
  "wheel.spin": "Spin",
  "wheel.spinning": "Spinning…",
  "wheel.youWon": "You won",
  "wheel.alreadySpun": "Your prize",
  "wheel.claim":
    "We will add it to your delivery. Nothing to do: the shop can already see it.",
  "wheel.failed": "The wheel could not be spun. Try again.",
  "err.loadWheel": "Failed to load the prize wheel.",
  "err.saveWheel": "Failed to save the prize wheel.",
  "err.spinWheel": "The wheel could not be spun.",

  // ── Recovering catalog edits stranded in this browser ──
  "nav.recover": "Publish device edits",
  "recover.title": "Publish edits made on this device",
  "recover.lede":
    "The shop used to save products inside this browser instead of on the server, so edits made then are invisible to everyone else. This compares what this browser still holds against the live shop, and publishes the difference.",
  "recover.noLocal": "Nothing stored on this device",
  "recover.noLocalHint":
    "This browser has no saved catalog, so there is nothing to publish. If you made the edits on another phone or computer, open this page there.",
  "recover.inSync": "Already published",
  "recover.inSyncHint":
    "All {n} products on this device match the live shop. Nothing to do.",
  "recover.toAdd": "To add",
  "recover.toUpdate": "To update",
  "recover.toDelete": "To remove",
  "recover.now": "live",
  "recover.yours": "yours",
  "recover.skipped": "Skipped",
  "recover.skippedNote": "its category is not in the live shop",
  "recover.categoriesKept":
    "Categories are left exactly as they are in the live shop. Only product details, photos and removals are published - so this cannot undo the brand grouping.",
  "recover.drastic":
    "This would remove {deletions} of the {local} products in the live shop. That is what an out-of-date device looks like - check the list below carefully before publishing.",
  "recover.confirm":
    "I have read the lists above. Make the live shop match this device, including the removals.",
  "recover.publish": "Publish to the live shop",
  "recover.done": "Published.",
  "recover.doneDetail": "{created} added, {updated} updated, {deleted} removed.",
  "recover.partial": "{n} could not be saved:",
} as const;

/** Every translatable string in the app. */
export type MessageKey = keyof typeof en;

const ar: Record<MessageKey, string> = {
  // ── Shared vocabulary ──
  "common.cart": "السلة",
  "common.orders": "الطلبات",
  "common.item": "منتج",
  "common.items": "منتجات",
  "common.itemsCount": "{n} منتج",
  "common.total": "المجموع",
  "common.subtotal": "المجموع الفرعي",
  "common.discount": "الخصم",
  "common.notes": "ملاحظات",
  "common.cancel": "إلغاء",
  "common.save": "حفظ",
  "common.delete": "حذف",
  "common.edit": "تعديل",
  "common.add": "إضافة",
  "common.close": "إغلاق",
  "common.search": "بحث",
  "common.clear": "مسح",
  "common.retry": "إعادة المحاولة",
  "common.saving": "جارٍ الحفظ…",
  "common.sure": "متأكد؟",
  "common.back": "رجوع",
  "common.all": "الكل",
  "common.pending": "قيد المراجعة",
  "common.approved": "مؤكد",
  "common.bonus": "هدية",
  "common.currency": "د.ع",
  "common.clickAgain": "اضغط مرة أخرى للتأكيد",
  "common.tapAgain": "المس مرة أخرى للتأكيد",
  "common.clearSearch": "مسح البحث",
  "common.brand": "velina",

  // ── Language toggle ──
  "lang.switchTo": "التبديل إلى الإنكليزية",
  "lang.label": "EN",

  // ── Theme toggle ──
  "theme.toLight": "التبديل إلى الوضع الفاتح",
  "theme.toDark": "التبديل إلى الوضع الداكن",
  "theme.light": "الوضع الفاتح",
  "theme.dark": "الوضع الداكن",

  // ── Storefront ──
  "shop.loading": "جارٍ فتح المتجر…",
  "shop.loadFailed": "تعذّر تحميل المتجر",
  "shop.searchPlaceholder": "ابحث عن منتج أو رمز…",
  "shop.searchAria": "البحث عن المنتجات",
  "shop.store": "المتجر",
  "shop.home": "الرئيسية",
  "shop.openCart": "فتح السلة",
  "shop.closeCart": "إغلاق السلة",
  "shop.allProducts": "كل المنتجات",
  "shop.products": "المنتجات",
  "shop.eyebrow": "العناية بالبشرة",
  "shop.headline1": "عافية يومية،",
  "shop.headline2": "مختارة بعناية.",
  "shop.lede":
    "تشكيلة منتقاة من منتجات العناية بالبشرة الموثوقة - تصفّح المجموعة وجهّز طلبك بلمسات قليلة.",
  "shop.ctaShop": "تسوّق المجموعة",
  "shop.ctaBrowse": "تصفّح الأقسام",
  "shop.price": "السعر",
  "shop.min": "الأدنى",
  "shop.max": "الأعلى",
  "shop.minWith": "الأدنى {n}",
  "shop.maxWith": "الأعلى {n}",
  "shop.minAria": "أدنى سعر",
  "shop.maxAria": "أعلى سعر",
  "shop.noMatch": "لا نتائج لـ «{q}»",
  "shop.noInRange": "لا توجد منتجات ضمن هذا النطاق السعري",
  "shop.noneYet": "لا توجد منتجات هنا بعد",
  "shop.tryAnother": "جرّب بحثاً أو قسماً آخر",
  "shop.tryWiden": "جرّب توسيع النطاق السعري أو إزالة الفلتر",
  "shop.addFromAdmin": "أضف منتجات من لوحة التحكم",
  "shop.footerBlurb":
    "مستحضرات العناية بالبشرة والعافية - مختارة وموصَّلة إليك.",
  "shop.copyright": "© 2026 velina - فيلينا. جميع الحقوق محفوظة.",
  "shop.featured": "مختارات",
  "shop.goodToSeeYou": "أهلاً بعودتك",

  // ── Install to home screen ──
  "app.installTitle": "ثبّت التطبيق",
  "app.installBody": "أضف فيلينا إلى شاشتك الرئيسية - بملء الشاشة وبلمسة واحدة.",
  "app.installIos": "اضغط زر المشاركة، ثم «إضافة إلى الشاشة الرئيسية».",
  "app.install": "تثبيت",
  "app.notNow": "ليس الآن",
  "app.updateReady": "يتوفّر إصدار جديد",
  "app.refresh": "تحديث",
  "app.offline": "لا يوجد اتصال. هذه آخر نسخة محفوظة من المتجر.",

  // ── البحث والفلاتر فوق شبكة المنتجات ──
  "finder.filters": "الفلاتر",

  // ── إشعارات يفعّلها المتسوّق لطلبه ──
  "notify.title": "نبّهني عند الجاهزية",
  "notify.body": "إشعار واحد على هذا الجهاز لحظة موافقة المتجر على طلبك.",
  "notify.turnOn": "نبّهني",
  "notify.on": "الإشعارات مفعّلة لهذا الطلب",
  "notify.blocked": "الإشعارات موقوفة لهذا الموقع في إعدادات متصفحك.",
  "notify.failed": "تعذّر تفعيل الإشعارات. أعد المحاولة.",
  "notify.working": "جارٍ التفعيل…",

  // ── Product card & detail ──
  "product.addToCart": "أضف إلى السلة",
  "product.viewDetails": "عرض تفاصيل {name}",
  "product.removeOne": "إزالة واحدة من {name}",
  "product.addOne": "إضافة واحدة من {name}",
  "product.remove": "إزالة {name}",
  "product.addAria": "إضافة {name}",
  "product.addBonus": "إضافة {name} كهدية",
  "product.inCart": "{n} في السلة",
  "product.magnify": "تكبير",
  "product.magnifyAria": "تكبير صورة المنتج",
  "product.benefits": "الفوائد",
  "product.ingredients": "المكوّنات",
  "product.howToUse": "طريقة الاستعمال",
  "product.noDetails": "لا توجد تفاصيل إضافية لهذا المنتج بعد.",
  "product.zoomIn": "تكبير",
  "product.zoomOut": "تصغير",
  "product.closeViewer": "إغلاق العارض",
  "product.zoomHint":
    "مرّر أو اقرص للتكبير · اسحب للتحريك · انقر مرتين لإعادة الضبط",

  // ── Cart ──
  "cart.title": "الطلب",
  "cart.empty": "السلة فارغة",
  "cart.emptyHint": "أضف منتجات لتكوين الطلب",
  "cart.removeFromOrder": "إزالة {name} من الطلب",
  "cart.discountPercent": "نسبة الخصم %",
  "cart.notesPlaceholder": "تعليمات خاصة…",
  "cart.discountWith": "الخصم ({n}%)",
  "cart.placeOrder": "إتمام الطلب",
  // ── Checkout details ──
  "checkout.name": "الاسم الكامل",
  "checkout.phone": "رقم الهاتف",
  "checkout.phonePlaceholder": "07XX XXX XXXX",
  "checkout.location": "موقع التوصيل",
  "checkout.locationPlaceholder": "المنطقة، الشارع، أقرب نقطة دالة…",
  "checkout.required": "أضف اسمك ورقم هاتفك وموقع التوصيل لإتمام الطلب.",
  "checkout.continue": "متابعة",
  "checkout.details": "معلومات التوصيل",
  "checkout.detailsHint": "أين نوصّل هذا الطلب، وباسم من؟",
  "checkout.stepTwo": "الخطوة ٢ من ٢",
  "checkout.backToOrder": "الرجوع إلى الطلب",
  "checkout.customer": "الزبون",
  "checkout.noDetails": "لا توجد معلومات توصيل لهذا الطلب",
  "checkout.openInMaps": "فتح في الخرائط",
  "cart.generateReceipt": "إصدار الفاتورة",
  "cart.approveOrder": "تأكيد الطلب",
  "cart.checkout": "الدفع",

  // ── Order confirmation ──
  "confirm.title": "تم استلام الطلب",
  "confirm.subtitle": "تم استلام طلبك - سنؤكده قريباً",
  "confirm.order": "الطلب",
  "confirm.items": "المنتجات",
  "confirm.note": "ستراجع الصيدلية طلبك وتؤكده قريباً.",
  "confirm.continue": "متابعة التسوّق",

  // ── Receipt ──
  "receipt.eyebrow": "طبي · العناية بالبشرة · المكمّلات",
  "receipt.pendingBadge": "قيد المراجعة",
  "receipt.item": "المنتج",
  "receipt.amount": "المبلغ",
  "receipt.grandTotal": "المجموع الكلي",
  "receipt.pendingFooter": "- استلمنا طلبك وسنؤكده قريباً -",
  "receipt.thanks": "- شكراً لتسوّقك معنا -",
  "receipt.print": "طباعة",
  "receipt.saveImage": "حفظ كصورة",
  "receipt.whatsapp": "إرسال عبر واتساب",
  "receipt.backToShop": "العودة إلى المتجر",
  "receipt.newOrder": "طلب جديد",
  "receipt.backToOrders": "العودة إلى الطلبات",
  "receipt.saveFailed":
    "تعذّر حفظ الصورة على هذا الجهاز - يُرجى التقاط لقطة شاشة للفاتورة بدلاً من ذلك.",
  "receipt.renderFailed": "تعذّر إنشاء الفاتورة.",

  // ── Sign in ──
  "auth.title": "دخول المسؤول",
  "auth.email": "البريد الإلكتروني",
  "auth.password": "كلمة المرور",
  "auth.emailPlaceholder": "you@example.com",
  "auth.passwordPlaceholder": "أدخل كلمة المرور",
  "auth.signIn": "تسجيل الدخول",
  "auth.signingIn": "جارٍ تسجيل الدخول…",
  "auth.failed": "فشل تسجيل الدخول.",
  "auth.expired": "انتهت الجلسة. يُرجى تسجيل الدخول مرة أخرى.",
  "auth.signOut": "تسجيل الخروج",
  "auth.defaultCredentials":
    "لم تُضبط بيانات دخول للمسؤول على هذا الخادم، لذا تعمل البيانات الافتراضية المدمجة - وهي منشورة في الشيفرة المصدرية. اضبط ADMIN_EMAIL و ADMIN_PASSWORD في إعدادات الاستضافة.",

  // ── Admin shell ──
  "nav.overview": "نظرة عامة",
  "nav.newSale": "عملية بيع",
  "nav.products": "المنتجات",
  "nav.categories": "الأقسام",
  "nav.orders": "الطلبات",
  "nav.consultations": "الاستشارات",
  "nav.backOffice": "لوحة التحكم",
  "nav.storefront": "المتجر",
  "nav.openMenu": "فتح القائمة",
  "nav.closeMenu": "إغلاق القائمة",

  // ── Admin overview ──
  "overview.title": "نظرة عامة",
  "overview.subtitle": "لمحة سريعة عن الكتالوج والمبيعات",
  "overview.totalSales": "إجمالي المبيعات",
  "overview.approvedOrders": "طلبات مؤكدة",
  "overview.pendingApproval": "{n} بانتظار التأكيد",
  "overview.allApproved": "الكل مؤكد",
  "overview.inCatalog": "في الكتالوج",
  "overview.active": "نشط",
  "overview.topProducts": "أعلى المنتجات إيراداً",
  "overview.noSales": "لا توجد مبيعات مسجّلة بعد",
  "overview.recentOrders": "أحدث الطلبات",
  "overview.viewAll": "عرض الكل",
  "overview.noOrders": "لا توجد طلبات مسجّلة بعد",
  "overview.discountSuffix": "خصم",

  // ── Admin products ──
  "products.subtitle": "{p} منتج ضمن {c} قسم",
  "products.addProduct": "إضافة منتج",
  "products.searchPlaceholder": "ابحث بالاسم أو الرمز…",
  "products.filterByCategory": "تصفية حسب القسم",
  "products.allCategories": "كل الأقسام",
  "products.noMatching": "لا توجد منتجات مطابقة",
  "products.editProduct": "تعديل المنتج",
  "products.deleteProduct": "حذف المنتج",
  "products.colCode": "الرمز",
  "products.colProduct": "المنتج",
  "products.colCategory": "القسم",
  "products.colPrice": "السعر",
  "products.colStock": "المخزون",
  "products.colActions": "إجراءات",

  // ── Stock ──
  "stock.label": "المخزون",
  "stock.edit": "تحديد مخزون {name}",
  "stock.untracked": "غير محسوب",
  "stock.untrackedHint":
    "هذا المنتج متاح للشراء دائماً. أدخل رقماً لبدء احتساب مخزونه.",
  "stock.inStock": "{n} متوفرة",
  "stock.outOfStock": "نفد المخزون",
  "stock.left": "بقيت {n} فقط",
  "stock.decrease": "إنقاص المخزون",
  "stock.increase": "زيادة المخزون",
  "stock.stopTracking": "إيقاف الاحتساب",
  "stock.saveFailed": "تعذّر حفظ كمية المخزون.",
  "stock.lowFilter": "مخزون منخفض أو نافد",
  "stock.variantHint":
    "يُستخدم لأي خيار لا يحدّد مخزوناً خاصاً به.",

  // ── إشعارات الهاتف (لوحة التحكم) ──
  "nav.notifications": "الإشعارات",
  "push.title": "إشعارات الهاتف",
  "push.subtitle": "تنبيه هذا الجهاز لحظة تقديم أي طلب، حتى والتطبيق مغلق.",
  "push.step1": "١. تشغيل الخدمة",
  "push.step2": "٢. هذا الجهاز",
  "push.keysMissing":
    "لا توجد مفاتيح إشعارات للمتجر بعد. إنشاء زوج مفاتيح يشغّل الخدمة لكل الأجهزة.",
  "push.keysReady": "خدمة الإشعارات تعمل.",
  "push.on": "مفعّلة",
  "push.off": "متوقفة",
  "push.fromEnv": "المفاتيح مضبوطة في بيئة النشر، ولا يمكن تغييرها من هنا.",
  "push.generate": "إنشاء المفاتيح",
  "push.clearKeys": "حذف المفاتيح",
  "push.clearWarn": "حذف المفاتيح يوقف التنبيهات عن كل الأجهزة.",
  "push.listening": "{n} أجهزة تستقبل التنبيهات",
  "push.listeningOne": "جهاز واحد يستقبل التنبيهات",
  "push.listeningNone": "لا يوجد جهاز يستقبل التنبيهات بعد",
  "push.deviceOn": "هذا الجهاز يستقبل التنبيهات",
  "push.deviceOff": "هذا الجهاز لا يستقبل التنبيهات",
  "push.turnOn": "نبّه هذا الجهاز",
  "push.turnOff": "أوقف التنبيه هنا",
  "push.test": "إرسال تجربة",
  "push.testSent": "تم الإرسال. سيصل خلال لحظات.",
  "push.blocked":
    "الإشعارات موقوفة لهذا الموقع في إعدادات متصفحك. أعد تشغيلها من هناك أولاً.",
  "push.unsupported":
    "هذا المتصفح لا يدعم الإشعارات. على الآيفون، ثبّت التطبيق على الشاشة الرئيسية أولاً.",
  "push.keysNeeded": "أنشئ المفاتيح أعلاه قبل تشغيل هذا الجهاز.",

  // ── تيليغرام ──
  "nav.telegram": "تيليغرام",
  "tg.title": "إشعارات تيليغرام",
  "tg.subtitle": "أرسل كل طلب إلى محادثة تيليغرام لحظة تقديمه.",
  "tg.step1": "١. البوت",
  "tg.step2": "٢. إلى أين تُرسل الطلبات",
  "tg.step3": "٣. الوجهات",
  "tg.connected": "متصل",
  "tg.notConnected": "غير متصل",
  "tg.connectedTo": "متصل بـ",
  "tg.fromEnv":
    "الرمز محدَّد عبر TELEGRAM_BOT_TOKEN في متغيّرات بيئة التطبيق. غيّره من هناك.",
  "tg.tokenLabel": "رمز البوت",
  "tg.tokenHint":
    "تحصل عليه من @BotFather في تيليغرام. يُحفظ على الخادم ولا يُعرض مرة أخرى.",
  "tg.tokenSaved": "تم حفظ رمز البوت.",
  "tg.step2Hint":
    "لا يستطيع البوت مراسلتك أولاً. افتح تيليغرام وأرسل أي رسالة إلى ‎@{bot}‎ - أو أضفه إلى مجموعة وأرسل رسالة فيها - ثم اضغط «بحث عن المحادثات».",
  "tg.findChats": "بحث عن المحادثات",
  "tg.added": "مضاف",
  "tg.noneFound":
    "لا توجد محادثات بعد. أرسل رسالة إلى البوت في تيليغرام ثم أعد المحاولة.",
  "tg.chatIdPlaceholder": "أو ألصق معرّف المحادثة",
  "tg.addManually": "إضافة",
  "tg.noChats": "لا توجد وجهات بعد - لا تُرسل الطلبات إلى أي مكان.",
  "tg.removeChat": "حذف هذه الوجهة",
  "tg.live": "الإرسال مفعّل",
  "tg.notLive": "الإرسال متوقف",
  "tg.sendTest": "إرسال رسالة تجريبية",
  "tg.testSent": "تم إرسال الرسالة التجريبية. تحقّق من تيليغرام.",
  "tg.whatGetsSent":
    "يُرسل كل طلب جديد مع منتجاته وخياراته ومجاميعه، واسم الزبون ورقمه ورابط الخريطة. الطلبات التي تعدّلها أو تؤكّدها لاحقاً لا يُعاد إرسالها.",
  "tg.loadFailed": "تعذّر تحميل إعدادات تيليغرام.",
  "tg.actionFailed": "لم تنجح العملية. حاول مرة أخرى.",

  // ── الخيارات (الأحجام والنكهات والدرجات) ──
  "variants.title": "الخيارات (اختياري)",
  "variants.hint":
    "الأحجام أو النكهات أو الدرجات - أي شكل يتوفّر به المنتج نفسه. أضفها ليختار المتسوّق واحداً قبل الإضافة إلى السلة. اترك السعر أو العرض أو المخزون فارغاً في أي خيار ليأخذ قيمة المنتج نفسه.",
  "variants.emptyHint":
    "لا توجد خيارات - يُباع هذا المنتج كما هو، بالسعر أعلاه.",
  "variants.addOption": "إضافة خيار",
  "variants.removeOption": "حذف هذا الخيار",
  "variants.moveUp": "تحريك للأعلى",
  "variants.moveDown": "تحريك للأسفل",
  "variants.name": "الخيار",
  "variants.nameAr": "الخيار (بالعربية)",
  "variants.namePlaceholder": "مثال: 100 ml",
  "variants.nameArPlaceholder": "مثال: ١٠٠ مل",
  "variants.codeSuffix": "الرمز",
  "variants.codePlaceholder": "100ML",
  "variants.price": "السعر",
  "variants.oldPrice": "السعر القديم",
  "variants.inherits": "كما أعلاه",
  "variants.chooseLabel": "اختر الخيار",
  "variants.chooseAria": "اختر خياراً لـ {name}",

  // ── إعلان الخصومات ──
  "promo.eyebrow": "على منتجات مختارة",
  "promo.title": "خصومات تصل إلى {n}%!",
  "promo.body": "منتجات مختارة عليها عروض الآن - ما دامت الكمية متوفرة.",
  "promo.cta": "تسوّق العروض",
  "promo.later": "ربما لاحقاً",
  "promo.onOffer": "العروض",

  // ── التصفّح (صفحة الفلترة: الفئة + الماركة) ──
  "browse.title": "تصفّح",
  "browse.category": "الفئة",
  "browse.brand": "الماركة",
  "browse.all": "الكل",
  "browse.clearAll": "مسح الكل",
  "browse.showResults": "عرض {n} منتجاً",
  "browse.showResultsOne": "عرض منتج واحد",
  "browse.noCategories": "لا توجد فئات بعد.",
  "browse.filtersActive": "{n} فلاتر",
  "browse.uncategorised": "بدون فئة",

  // ── Offers ──
  "offer.percentOff": "−{n}%",
  "offer.youSave": "توفّر {n} {currency}",

  // ── شريط العروض في الصفحة الرئيسية ──
  "home.deck": "أبرز ما لدينا",
  "home.slideOf": "الشريحة {n} من {total}",
  "home.prev": "الشريحة السابقة",
  "home.next": "الشريحة التالية",
  "home.goTo": "الانتقال إلى الشريحة {n}",
  "home.viewProduct": "عرض المنتج",
  "home.slideDetails": "اقرأ المزيد عن هذا",
  "home.seeAll": "عرض الكل",

  // ── استشارة العناية بالبشرة ──
  "consult.eyebrow": "استشارة مجانية للعناية بالبشرة",
  "consult.title": "لا تعرف من أين تبدأ؟",
  "consult.inviteBody":
    "أخبرنا عن بشرتك ونقترح لك روتيناً مناسباً - مجاناً ودون أي التزام.",
  "consult.body":
    "أخبرنا عن بشرتك واترك رقمك، وسيتواصل معك أحد فريق المتجر ليقترح لك روتيناً مناسباً - مجاناً ودون أي التزام.",
  "consult.name": "الاسم",
  "consult.namePlaceholder": "مثلاً: زينب",
  "consult.phone": "رقم الهاتف",
  "consult.phonePlaceholder": "07XX XXX XXXX",
  "consult.age": "العمر",
  "consult.agePlaceholder": "اختياري",
  "consult.gender": "الجنس",
  "consult.genderFemale": "أنثى",
  "consult.genderMale": "ذكر",
  "consult.city": "المدينة أو المنطقة",
  "consult.cityPlaceholder": "اختياري - مثل: بغداد، الكرادة",
  "consult.routine": "ما الذي تستخدمينه حالياً؟",
  "consult.routinePlaceholder":
    "اختياري - غسول، كريم، واقي شمس، أي شيء تستخدمينه الآن",
  "consult.allergies": "حساسية أو أدوية",
  "consult.allergiesPlaceholder":
    "اختياري - أي شيء سبّب تهيّجاً لبشرتك، أو علاج تتناولينه",
  "consult.budget": "الميزانية التقريبية",
  "consult.budgetPlaceholder": "اختياري",
  "consult.pregnancy": "حامل أو مرضعة؟",
  "consult.pregnant": "حامل",
  "consult.breastfeeding": "مرضعة",
  "consult.pregnancyNeither": "لا ينطبق",
  "consult.photo": "صورة لبشرتك",
  "consult.photoHint":
    "اختياري. بضوء النهار، بدون مكياج، ومن الأمام - تفيد أكثر من أي وصف.",
  "consult.photoAdd": "إضافة صورة",
  "consult.photoReplace": "اختيار صورة أخرى",
  "consult.photoRemove": "إزالة الصورة",
  "consult.photoUploading": "جارٍ الإضافة…",
  "consult.optional": "اختياري",
  "consult.skinType": "نوع بشرتك",
  "consult.skinNormal": "عادية",
  "consult.skinDry": "جافة",
  "consult.skinOily": "دهنية",
  "consult.skinCombination": "مختلطة",
  "consult.skinSensitive": "حساسة",
  "consult.concerns": "بماذا تودّ أن نساعدك؟",
  "consult.concernAcne": "حب الشباب",
  "consult.concernDarkSpots": "التصبغات والبقع الداكنة",
  "consult.concernAgeing": "الخطوط الدقيقة",
  "consult.concernDryness": "الجفاف",
  "consult.concernSensitivity": "الاحمرار والحساسية",
  "consult.concernPores": "المسام الواسعة",
  "consult.concernSunDamage": "أضرار الشمس",
  "consult.notes": "هل من شيء آخر يجدر بنا معرفته؟",
  "consult.notesPlaceholder":
    "ما الذي تستخدمه حالياً، وما الذي سبّب تهيّجاً لبشرتك، وما الذي تطمح إليه…",
  "consult.submit": "اطلب استشارة",
  "consult.sending": "جارٍ الإرسال…",
  "consult.required": "الاسم ورقم الهاتف ونوع البشرة مطلوبة.",
  "consult.sentTitle": "شكراً لك - وصلنا طلبك",
  "consult.sentBody":
    "سيتواصل معك أحد فريق المتجر على الرقم الذي تركته. وإذا أرسلت الطلب خارج أوقات الدوام، فتوقّع التواصل في يوم العمل التالي.",
  "consult.sendAnother": "إرسال طلب آخر",
  "consult.filterWaiting": "بالانتظار ({n})",
  "consult.filterAll": "الكل",
  "consult.waiting": "بالانتظار",
  "consult.done": "تم",
  "consult.markDone": "تمّت المتابعة",
  "consult.reopen": "إعادة الفتح",
  "consult.whatsapp": "واتساب",
  "consult.waMessage":
    "مرحباً {name}، معك velina - لقد طلبت منّا استشارة للعناية بالبشرة.",
  "consult.noneWaiting": "لا يوجد شيء بالانتظار. تمّت متابعة كل الطلبات.",
  "consult.noneYet": "لا توجد طلبات استشارة بعد.",
  "home.statProducts": "منتجات",
  "home.statBrands": "ماركات",
  "home.statCategories": "أقسام",

  // ── الحقائب ──
  // ── شرائح الصفحة الرئيسية (لوحة الإدارة) ──
  "nav.homeSlides": "شرائح الرئيسية",
  "deck.subtitle":
    "العرض المتحرك الذي تفتح به الصفحة الرئيسية. الحقائب لها شرائحها الخاصة، وهاتان الشريحتان ما عداها.",
  "deck.blankHint":
    "كل الحقول اختيارية. اترك أيّاً منها فارغاً لتبقى الشريحة على النص الحالي، باللغتين.",
  "photo.replace": "استبدال",
  "deck.photoWide": "صورة الحاسوب",
  "deck.photoWideHint": "عريضة. تملأ الشريحة على الحاسوب واللوحي.",
  "deck.photoMobile": "صورة الهاتف",
  "deck.photoMobileHint":
    "أطول، للشاشات الضيقة. اتركها فارغة لاستخدام صورة الحاسوب في كل مكان.",
  "pkg.photoWide": "صورة الحاسوب",
  "pkg.photoWideHint": "عريضة. تملأ الشريحة على الحاسوب واللوحي.",
  "pkg.photoMobile": "صورة الهاتف",
  "pkg.photoMobileHint":
    "أطول، للشاشات الضيقة. اتركها فارغة لاستخدام صورة الحاسوب في كل مكان.",
  "deck.photo": "الصورة",
  "deck.photoHint":
    "اختيارية. مع صورة، تملأ الشريحة بالكامل ويظهر النص فوقها كما في الحقائب. وبدونها يظهر النص بجانب صور المنتجات. يفضّل صورة عريضة.",
  "deck.brief": "التعريف",
  "deck.briefHint": "الشريحة الأولى - ما هو هذا المتجر.",
  "deck.offer": "إعلان الخصم",
  "deck.offerHint": "الشريحة الأخيرة. لا تظهر إلا إذا كان هناك عرض فعلي.",
  "deck.packages": "الحقائب",
  "deck.packagesHint": "شريحة لكل حقيبة، بين الاثنتين. تُحرَّر مع الحقيبة نفسها.",
  "deck.eyebrow": "السطر الصغير فوق",
  "deck.eyebrowAr": "السطر الصغير بالعربية",
  "deck.headline": "العنوان",
  "deck.headlineAr": "العنوان بالعربية",
  "deck.headlineHint": "اضغط Enter لسطر جديد. ويُستبدل {n} برقم الخصم.",
  "deck.body": "الجملة تحته",
  "deck.bodyAr": "الجملة تحته بالعربية",
  "deck.stats": "إظهار الأعداد",
  "deck.statsHint": "أعداد المنتجات والماركات والأقسام تحت الجملة.",
  "deck.percent": "رقم الخصم",
  "deck.percentHint": "ما يعلنه الإعلان، هنا وفي النافذة المنبثقة. يُكتب مكان {n}.",
  "deck.shown": "ظاهرة",
  "deck.hiddenSlide": "مخفية",
  "deck.saved": "تم الحفظ",
  "deck.reset": "استعادة",
  "deck.resetHint": "إفراغ كل الحقول والعودة للنص الأصلي. اضغط حفظ للتطبيق.",

  "pkg.eyebrow": "حقيبة",
  "pkg.whatsInside": "ماذا تحتوي",
  "pkg.timesQty": "× {n}",
  "pkg.emptyNote": "اسألنا عمّا تحتويه هذه الحقيبة.",
  "pkg.viewDetails": "عرض محتويات {name}",
  "pkg.photoHint":
    "تملأ الشريحة بالكامل في الصفحة الرئيسية، لذا يفضّل صورة عريضة للحقيبة. وبدونها تعرض الشريحة المنتجات التي بداخلها.",
  "pkg.inCart": "{n} في سلّتك",
  "pkg.itemsCount": "{n} منتجات",
  "pkg.oneItem": "منتج واحد",
  "pkg.addToCart": "أضف الحقيبة",
  "pkg.save": "توفير {n}",

  // ── الحقائب (لوحة الإدارة) ──
  "nav.packages": "الحقائب",
  "pkg.subtitle":
    "اجمع منتجات وبِعها بسعر واحد. لا تظهر الحقيبة في المتجر إلا بعد تفعيلها.",
  "pkg.new": "حقيبة جديدة",
  "pkg.edit": "تعديل الحقيبة",
  "pkg.name": "اسم الحقيبة",
  "pkg.namePlaceholder": "مثال: Back to School",
  "pkg.nameAr": "الاسم بالعربية",
  "pkg.nameArPlaceholder": "العودة إلى المدرسة",
  "pkg.description": "سطر تعريفي",
  "pkg.descriptionPlaceholder": "لمن هذه الحقيبة، بجملة واحدة",
  "pkg.descriptionAr": "السطر بالعربية",
  "pkg.contents": "المحتويات",
  "pkg.contentsHint":
    "اختر منتجات من الكتالوج. إذا حُذف منتج لاحقاً فإنه يسقط من الحقيبة تلقائياً.",
  "pkg.addProduct": "إضافة منتج",
  "pkg.pickProduct": "اختر منتجاً…",
  "pkg.noContents": "لا توجد منتجات في هذه الحقيبة بعد.",
  "pkg.removeItem": "إزالة",
  "pkg.qtyAria": "الكمية من {name}",
  "pkg.separately": "السعر مفرّقاً",
  "pkg.packagePrice": "سعر الحقيبة",
  "pkg.wasPrice": "السعر قبل الخصم",
  "pkg.wasHint": "يظهر مشطوباً. اتركه فارغاً إن لم يكن هناك عرض.",
  "pkg.useSeparately": "استخدم {n}",
  "pkg.saving": "يوفّر الزبون {n} ({p}٪)",
  "pkg.live": "ظاهرة في المتجر",
  "pkg.hidden": "مخفية",
  "pkg.showOnStorefront": "إظهارها في الصفحة الرئيسية",
  "pkg.hiddenHint": "فعّلها لتظهر في الصفحة الرئيسية للمتجر.",
  "pkg.noneYet": "لا توجد حقائب بعد.",
  "pkg.noneYetHint": "أنشئ واحدة وستظهر في الصفحة الرئيسية للمتجر.",
  "pkg.deletePackage": "حذف الحقيبة",
  "pkg.moveUp": "تحريك لأعلى",
  "pkg.moveDown": "تحريك لأسفل",
  "pkg.needsPrice": "تحتاج سعراً",
  "pkg.needsItems": "فارغة",

  // ── Searchable dropdown ──
  "dropdown.search": "بحث…",
  "dropdown.noResults": "لا توجد نتائج",

  // ── Product modal ──
  "modal.newProduct": "منتج جديد",
  "modal.editProduct": "تعديل المنتج",
  "modal.name": "الاسم",
  "modal.nameAr": "الاسم (بالعربية)",
  "modal.code": "الرمز",
  "modal.priceIqd": "السعر (د.ع)",
  "modal.oldPriceIqd": "السعر القديم (د.ع) - اختياري",
  "modal.noOffer": "لا يوجد عرض",
  "modal.clearOffer": "مسح",
  "modal.oldPriceHint":
    "اتركه فارغاً لعرض سعر واحد. أدخل السعر السابق ليظهر للمتسوّقين مشطوباً بجانب السعر الحالي.",
  "modal.offerPreview":
    "سيرى المتسوّقون {old} مشطوباً ثم {price} {currency} - خصم {n}%.",
  "modal.brand": "الماركة",
  "modal.brandAria": "ماركة المنتج",
  "modal.productCategory": "الفئة",
  "modal.productCategoryAria": "فئة المنتج",
  "modal.noCategory": "بدون فئة",
  "modal.productCategoryHint":
    "نوع المنتج. يستخدمه المتسوّقون للتصفية إلى جانب الماركة.",
  "modal.photo": "الصورة",
  "modal.preview": "معاينة",
  "modal.removePhoto": "إزالة الصورة",
  "modal.uploadPhoto": "رفع صورة",
  "modal.uploading": "جارٍ الرفع…",
  "modal.detailsTitle": "التفاصيل (اختياري)",
  "modal.detailsHint": "تظهر هذه عندما يفتح المتسوّق صفحة المنتج.",
  "modal.arabicTitle": "المحتوى العربي (اختياري)",
  "modal.arabicHint":
    "يظهر للمتسوّقين الذين يتصفّحون بالعربية. أي حقل يُترك فارغاً يعود تلقائياً إلى النص الإنكليزي.",
  "modal.description": "الوصف",
  "modal.benefits": "الفوائد",
  "modal.ingredients": "المكوّنات",
  "modal.howToUse": "طريقة الاستعمال",
  "modal.namePlaceholder": "مثال: HAIR SKIN NAILS GUMMIES",
  "modal.nameArPlaceholder": "مثال: علكات الشعر والبشرة والأظافر",
  "modal.codePlaceholder": "مثال: F173",
  "modal.pricePlaceholder": "مثال: 21000",
  "modal.descriptionPlaceholder": "نبذة مختصرة عن المنتج…",
  "modal.benefitsPlaceholder": "ما الذي يساعد عليه - نقطة في كل سطر…",
  "modal.ingredientsPlaceholder": "المكوّنات الفعّالة / التركيبة…",
  "modal.usagePlaceholder": "الإرشادات / الجرعة…",
  "modal.confirmDelete": "تأكيد الحذف",
  "modal.saveChanges": "حفظ التغييرات",

  // ── Admin categories ──
  "categories.subtitle": "أعد التسمية والترتيب ونظّم أقسام الكتالوج",
  "categories.newPlaceholder": "اسم قسم جديد (مثال: العناية بالشفاه)",
  "categories.newArPlaceholder": "الاسم بالعربية (اختياري)",
  "categories.arabicName": "الاسم بالعربية",
  "categories.moveUp": "تحريك للأعلى",
  "categories.moveDown": "تحريك للأسفل",
  "categories.rename": "إعادة تسمية القسم",
  "categories.deleteCategory": "حذف القسم",
  "categories.saveName": "حفظ الاسم",
  "categories.cancelRename": "إلغاء إعادة التسمية",
  "categories.hasProducts":
    "لا يمكن حذف «{name}» - يحتوي على {n} منتج. انقلها أو احذفها أولاً.",

  // ── Admin orders ──
  "orders.subtitle": "{n} طلب · {money} مبيعات مؤكدة",
  "orders.awaiting": "{n} بانتظار التأكيد",
  "orders.filterAll": "الكل ({n})",
  "orders.filterPending": "قيد المراجعة ({n})",
  "orders.noPending": "لا توجد طلبات قيد المراجعة",
  "orders.noOrders": "لا توجد طلبات بعد",
  "orders.noOrdersHint": "تظهر هنا الطلبات القادمة من المتجر لمراجعتها",
  "orders.line": "سطر",
  "orders.lines": "أسطر",
  "orders.reviewEdit": "مراجعة وتعديل",
  "orders.approveAsIs": "تأكيد كما هو",
  "orders.approving": "جارٍ التأكيد…",
  "orders.receipt": "الفاتورة",
  "orders.whatsapp": "واتساب",
  "orders.whatsappCustomer": "إرسال إلى الزبون",
  "orders.waGreeting": "مرحباً {name}، معك velina - بخصوص طلبك {no}.",
  "orders.waGreetingAnon": "مرحباً، معك velina - بخصوص طلبك {no}.",
  "orders.deletePermanently": "حذف نهائي؟",
  "orders.yesDelete": "نعم، احذف",
  "orders.deleting": "جارٍ الحذف…",

  // ── Admin sale screen ──
  "sell.reviewOrder": "مراجعة الطلب #{n}",
  "sell.reviewHint": "عدّل المنتجات والهدايا والخصم - الحفظ يؤكد الطلب",
  "sell.newHint": "تتوفر الهدايا وتعديل الأسعار والخصومات",
  "sell.emptyCatalog": "لا توجد منتجات في الكتالوج",

  // ── Data-layer errors ──
  "err.codeExists": "رمز المنتج '{code}' موجود مسبقاً.",
  "err.codeInUse": "رمز المنتج '{code}' مستخدم بالفعل.",
  "err.productMissing": "المنتج غير موجود.",
  "err.categoryExists": "اسم القسم '{name}' موجود مسبقاً.",
  "err.categoryMissing": "القسم غير موجود.",
  "err.categoryHasProducts": "لا يمكن حذف قسم يحتوي على منتجات.",
  "err.placeOrder": "تعذّر إرسال الطلب.",
  "err.loadOrders": "تعذّر تحميل الطلبات.",
  "err.loadOrder": "تعذّر تحميل الطلب.",
  "err.updateOrder": "تعذّر تحديث الطلب.",
  "err.deleteOrder": "تعذّر حذف الطلب.",
  "err.lookupFailed": "فشل البحث.",
  "err.sendConsult": "تعذّر إرسال الطلب.",
  "err.loadConsults": "تعذّر تحميل طلبات الاستشارة.",
  "err.updateConsult": "تعذّر تحديث الطلب.",
  "err.deleteConsult": "تعذّر حذف الطلب.",
  "err.packageNameRequired": "اسم الحقيبة مطلوب.",
  "err.loadDeck": "تعذّر تحميل شرائح الصفحة الرئيسية.",
  "err.saveDeck": "تعذّر حفظ شرائح الصفحة الرئيسية.",
  "err.loadPackages": "تعذّر تحميل الحقائب.",
  "err.savePackage": "تعذّر حفظ الحقيبة.",
  "err.deletePackage": "تعذّر حذف الحقيبة.",
  "err.saveOrder": "تعذّر حفظ الطلب: {reason}",
  "err.nameRequired": "اسم المنتج مطلوب.",
  "err.codeRequired": "رمز المنتج مطلوب.",
  "err.priceInvalid": "يجب أن يكون السعر رقماً موجباً صحيحاً.",
  "err.oldPriceInvalid": "يجب أن يكون السعر القديم رقماً موجباً صحيحاً.",
  "err.oldPriceTooLow":
    "يجب أن يكون السعر القديم أعلى من السعر الحالي، وإلا فلا يوجد خصم لعرضه.",
  "err.variantNameRequired": "كل خيار يحتاج إلى اسم.",
  "err.variantDuplicate": "هناك خياران يحملان الاسم نفسه.",
  "err.variantOldPriceTooLow":
    "يجب أن يكون السعر القديم لـ \"{name}\" أعلى من سعر بيعه.",
  "err.categoryRequired": "يُرجى اختيار قسم.",
  "err.uploadFailed": "تعذّر رفع الصورة",
  "err.saveGeneric": "حدث خطأ أثناء الحفظ.",
  "err.deleteProduct": "تعذّر حذف المنتج.",
  "err.loadProducts": "تعذّر تحميل المنتجات.",
  "err.saveProduct": "تعذّر حفظ المنتج.",
  "err.saveCategory": "تعذّر حفظ القسم.",
  "err.deleteCategory": "تعذّر حذف القسم.",

  // ── عجلة الجوائز ──
  "nav.wheel": "عجلة الجوائز",
  "wheel.lede":
    "عجلة يُديرها الزبون مرة واحدة بعد إتمام طلبه. اكتب الجوائز، ثم حدِّد أي نطاق سعري يربح أياً منها: قيمة الطلب هي التي تُقرّر ما يلعب عليه.",
  "wheel.enabled": "تشغيل العجلة",
  "wheel.enabledHint":
    "عند الإيقاف لا تُعرض العجلة على أحد، ولا يضيع شيء مما في الأسفل.",
  "wheel.on": "تعمل",
  "wheel.off": "متوقفة",
  "wheel.prizes": "الجوائز",
  "wheel.prizesHint":
    "كل ما يمكن ربحه. لا تصل الجائزة إلى العجلة إلا بعد أن يختارها أحد النطاقات في الأسفل.",
  "wheel.addPrize": "إضافة جائزة",
  "wheel.noPrizes": "لا توجد جوائز بعد. أضِف أول واحدة لتبدأ ببناء العجلة.",
  "wheel.name": "الجائزة",
  "wheel.nameAr": "الجائزة (بالعربية)",
  "wheel.namePlaceholder": "توصيل مجاني",
  "wheel.photo": "الصورة",
  "wheel.untitled": "جائزة بلا اسم",
  "wheel.chance": "فرصة الربح",
  "wheel.chanceHint":
    "مدى احتمال هذه الجائزة مقارنةً ببقية جوائز العجلة نفسها. الأرقام المتساوية تعني عجلة متكافئة، و1 مقابل 9 تعني واحداً من عشرة. والصفر يُبقيها على العجلة دون أن تخرج أبداً.",
  "wheel.ranges": "النطاقات السعرية",
  "wheel.rangesHint":
    "ما يلعب عليه طلبٌ بحجم معيّن. وعند تداخل نطاقين، يفوز النطاق الذي يبدأ من رقم أعلى.",
  "wheel.addRange": "إضافة نطاق",
  "wheel.noRanges": "لا توجد نطاقات بعد. أضِف واحداً لتحديد ما يربحه الطلب.",
  "wheel.prizesFirst": "أضِف جائزة أولاً: النطاق يحتاج إلى ما يُربح.",
  "wheel.from": "من",
  "wheel.to": "إلى",
  "wheel.noCeiling": "فما فوق",
  "wheel.badRange":
    "الحد الأعلى أقل من الحد الأدنى، فلا يمكن لأي طلب أن يقع في هذا النطاق.",
  "wheel.rangeWins": "يربح إحدى هذه",
  "wheel.rangeEmpty":
    "لم تُختَر أي جائزة، لذلك لا تُعرض عجلة على طلب في هذا النطاق.",
  "wheel.try": "جرّب مبلغاً",
  "wheel.tryHint": "اطّلع على ما يقابله طلبٌ بأي قيمة، دون الحاجة إلى إنشاء طلب.",
  "wheel.tryTotal": "مجموع الطلب",
  "wheel.tryRange": "النطاق من {from} إلى {to}",
  "wheel.tryRangeOpen": "النطاق من {from} فما فوق",
  "wheel.tryNoRange": "لا يغطي أي نطاق هذا المبلغ، لذلك لا تُعرض عجلة.",
  "wheel.tryWhileOff": "معروض كما لو كانت العجلة تعمل. هي متوقفة حالياً.",
  "wheel.wonLabel": "الجائزة",
  "wheel.title": "أدِر العجلة",
  "wheel.subtitle": "طلبك يمنحك دورة واحدة. حظاً موفقاً.",
  "wheel.spin": "أدِر العجلة",
  "wheel.spinning": "تدور…",
  "wheel.youWon": "لقد ربحت",
  "wheel.alreadySpun": "جائزتك",
  "wheel.claim":
    "سنضيفها إلى طلبك عند التوصيل. لا حاجة لأي إجراء: المتجر يراها الآن.",
  "wheel.failed": "تعذّر تدوير العجلة. حاول مرة أخرى.",
  "err.loadWheel": "تعذّر تحميل عجلة الجوائز.",
  "err.saveWheel": "تعذّر حفظ عجلة الجوائز.",
  "err.spinWheel": "تعذّر تدوير العجلة.",

  // ── Recovering catalog edits stranded in this browser ──
  "nav.recover": "نشر تعديلات الجهاز",
  "recover.title": "نشر التعديلات التي أُجريت على هذا الجهاز",
  "recover.lede":
    "كان المتجر يحفظ المنتجات داخل هذا المتصفح بدل الخادم، لذلك التعديلات التي أُجريت آنذاك لا يراها أحد غيرك. هنا نقارن ما يحتفظ به هذا المتصفح مع المتجر المنشور، ثم ننشر الفرق.",
  "recover.noLocal": "لا يوجد شيء محفوظ على هذا الجهاز",
  "recover.noLocalHint":
    "لا يحتوي هذا المتصفح على كتالوج محفوظ، فليس هناك ما يُنشر. إذا أجريت التعديلات على هاتف أو حاسوب آخر، افتح هذه الصفحة هناك.",
  "recover.inSync": "منشور بالفعل",
  "recover.inSyncHint":
    "جميع المنتجات على هذا الجهاز ({n}) مطابقة للمتجر المنشور. لا حاجة لأي إجراء.",
  "recover.toAdd": "ستُضاف",
  "recover.toUpdate": "ستُحدَّث",
  "recover.toDelete": "ستُحذف",
  "recover.now": "المنشور",
  "recover.yours": "لديك",
  "recover.skipped": "مُتخطّى",
  "recover.skippedNote": "قسمه غير موجود في المتجر المنشور",
  "recover.categoriesKept":
    "تبقى الأقسام كما هي في المتجر المنشور تماماً. لا يُنشر سوى تفاصيل المنتجات وصورها وعمليات الحذف، لذلك لا يمكن لهذه العملية أن تُلغي التصنيف حسب الماركة.",
  "recover.drastic":
    "سيؤدي هذا إلى حذف {deletions} من أصل {local} منتجاً في المتجر المنشور، وهذا ما يبدو عليه جهاز قديم غير محدَّث. راجع القوائم أدناه بعناية قبل النشر.",
  "recover.confirm":
    "قرأتُ القوائم أعلاه. اجعل المتجر المنشور مطابقاً لهذا الجهاز، بما في ذلك عمليات الحذف.",
  "recover.publish": "النشر إلى المتجر",
  "recover.done": "تم النشر.",
  "recover.doneDetail": "أُضيف {created}، وحُدِّث {updated}، وحُذف {deleted}.",
  "recover.partial": "تعذّر حفظ {n}:",
};

const MESSAGES: Record<Lang, Record<MessageKey, string>> = { en, ar };

/** Values substituted into {placeholders}. */
export type Vars = Record<string, string | number>;

/** Fill {placeholders} in a string. Exported for copy the admin writes,
 *  which carries the same placeholders as the shipped translations. */
export function format(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in vars ? String(vars[key]) : whole,
  );
}

/** Look up a message in an explicit language. */
export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  return format(MESSAGES[lang][key] ?? MESSAGES.en[key] ?? key, vars);
}

// ── Ambient language, for code outside React ────────────────────────
// The provider keeps this in sync so plain modules (lib/api.ts, lib/format.ts)
// can translate without every call site threading a hook through.

let activeLang: Lang = "en";

export function setActiveLang(lang: Lang): void {
  activeLang = lang;
}

export function getActiveLang(): Lang {
  return activeLang;
}

/** Translate in the currently active language. For non-React modules. */
export function tt(key: MessageKey, vars?: Vars): string {
  return translate(activeLang, key, vars);
}

// ── Localised content fields ────────────────────────────────────────

/** The Arabic twin of a content field, e.g. name -> name_ar. */
type ArabicOf<K extends string> = `${K}_ar`;

/**
 * Pick the reader's language for a content field, falling back to the English
 * value whenever the Arabic one is missing or blank. Product and category copy
 * is authored per-language in the admin; nothing has to be translated for the
 * storefront to stay readable.
 */
export function localized<
  K extends string,
  T extends Partial<Record<K | ArabicOf<K>, string | undefined>>,
>(record: T, field: K, lang: Lang): string {
  const base = (record[field as keyof T] as string | undefined) ?? "";
  if (lang !== "ar") return base;
  const arabic = record[`${field}_ar` as keyof T] as string | undefined;
  return arabic?.trim() ? arabic : base;
}
