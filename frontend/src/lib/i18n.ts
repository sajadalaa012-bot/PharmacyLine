// Bilingual dictionary (English + Arabic) for the storefront and back office.
//
// The English map is the source of truth: its keys type every lookup, so a
// missing Arabic string is a compile error rather than a blank label.
// Placeholders are written {like_this} and filled by `format`.
//
// Framework-free on purpose — the server layout, client components, and the
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
 * Best language for a visitor who has not chosen one yet, read from the
 * request's Accept-Language. Only two languages are on offer, so this asks the
 * narrow question "did they ask for Arabic before they asked for anything
 * else?" rather than running a full locale negotiation.
 */
export function preferredLang(acceptLanguage: string | null | undefined): Lang {
  if (!acceptLanguage) return "en";
  const ranked = acceptLanguage
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((p) => /^q=([\d.]+)$/i.exec(p.trim())?.[1])
        .find(Boolean);
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((entry) => entry.tag && Number.isFinite(entry.q) && entry.q > 0)
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    if (tag === "ar" || tag.startsWith("ar-")) return "ar";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }
  return "en";
}

// ── Dictionaries ────────────────────────────────────────────────────

const en = {
  // ── Shared vocabulary ──
  "common.cart": "Cart",
  "common.orders": "Orders",
  "common.myOrders": "My Orders",
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
  "common.brand": "Pharmacy Line",

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
  "shop.eyebrow": "Pharmacy · Skincare · Supplements",
  "shop.headline1": "Everyday wellness,",
  "shop.headline2": "thoughtfully curated.",
  "shop.lede":
    "A considered edit of trusted medical, skincare, and supplement essentials — browse the collection and build your order in a few taps.",
  "shop.ctaShop": "Shop the collection",
  "shop.ctaBrowse": "Browse categories",
  "shop.inCollection": "In the collection",
  "shop.productsInStock": "products in stock",
  "shop.categories": "categories",
  "shop.trustDelivery": "Fast local delivery",
  "shop.trustAuthentic": "Authentic & sealed",
  "shop.trustCurated": "Hand-picked selection",
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
    "Pharmacy, skincare, and wellness essentials — curated and delivered.",
  "shop.copyright":
    "© 2026 Pharmacy Line — Pharmacy & Wellness. All rights reserved.",
  "shop.staffLogin": "Staff login",
  "shop.browseCategories": "Shop by category",
  "shop.featured": "Featured",
  "shop.seeAll": "See all",
  "shop.goodToSeeYou": "Welcome back",

  // ── Install to home screen ──
  "app.installTitle": "Install the app",
  "app.installBody": "Add Pharmacy Line to your home screen — full screen, one tap away.",
  "app.installIos": "Tap the Share button, then “Add to Home Screen”.",
  "app.install": "Install",
  "app.notNow": "Not now",

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
  "cart.generateReceipt": "Generate Receipt",
  "cart.approveOrder": "Approve Order",
  "cart.checkout": "Checkout",

  // ── Order confirmation & history ──
  "confirm.title": "Order received",
  "confirm.subtitle": "We have received your order — we will confirm it shortly",
  "confirm.order": "Order",
  "confirm.items": "Items",
  "confirm.note": "The pharmacy will review your order and confirm it shortly.",
  "confirm.continue": "Continue Shopping",
  "history.empty": "No orders yet",
  "history.emptyHint": "Orders you place will show up here.",

  // ── Receipt ──
  "receipt.eyebrow": "Medical · Skincare · Supplements",
  "receipt.pendingBadge": "Pending approval",
  "receipt.item": "Item",
  "receipt.amount": "Amount",
  "receipt.grandTotal": "Grand total",
  "receipt.pendingFooter":
    "— We received your order and will confirm it shortly —",
  "receipt.thanks": "— Thank you for your purchase —",
  "receipt.print": "Print",
  "receipt.saveImage": "Save Image",
  "receipt.whatsapp": "Send via WhatsApp",
  "receipt.backToShop": "Back to shop",
  "receipt.newOrder": "New order",
  "receipt.backToOrders": "Back to orders",
  "receipt.saveFailed":
    "Couldn't save the image on this device — please take a screenshot of the receipt instead.",
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
    "No admin credentials are configured on this host, so the built-in defaults are in force — and those are public in the source. Set ADMIN_EMAIL and ADMIN_PASSWORD in your hosting environment.",

  // ── Admin shell ──
  "nav.overview": "Overview",
  "nav.newSale": "New sale",
  "nav.products": "Products",
  "nav.categories": "Categories",
  "nav.orders": "Orders",
  "nav.pharmacies": "Pharmacies",
  "nav.map": "Visit map",
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
  "modal.category": "Category",
  "modal.categoryAria": "Product category",
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
  "modal.benefitsPlaceholder": "What it helps with — one point per line…",
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
    "Cannot delete “{name}” — it contains {n} products. Move or delete them first.",

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
  "orders.deletePermanently": "Delete permanently?",
  "orders.yesDelete": "Yes, delete",
  "orders.deleting": "Deleting…",

  // ── Admin sale screen ──
  "sell.reviewOrder": "Review order #{n}",
  "sell.reviewHint":
    "Adjust items, bonuses, and discount — saving approves the order",
  "sell.newHint": "Bonus items, price overrides, and discounts available",
  "sell.emptyCatalog": "No products in the catalog",

  // ── Pharmacies ──
  "pharm.title": "Pharmacies",
  "pharm.subtitle":
    "Directory board — saved to your account and synced on every device",
  "pharm.visitMap": "Visit map",
  "pharm.addPharmacy": "Add pharmacy",
  "pharm.allPharmacies": "All pharmacies",
  "pharm.unfiled": "Unfiled",
  "pharm.newFolder": "New folder",
  "pharm.folderName": "Folder name",
  "pharm.createFolder": "Create folder",
  "pharm.renameFolder": "Rename folder",
  "pharm.deleteFolder": "Delete folder",
  "pharm.newPharmacy": "New pharmacy",
  "pharm.editPharmacy": "Edit pharmacy",
  "pharm.deletePharmacy": "Delete pharmacy",
  "pharm.closeForm": "Close form",
  "pharm.name": "Pharmacy name",
  "pharm.namePlaceholder": "e.g. Al-Shifa Pharmacy",
  "pharm.folder": "Folder",
  "pharm.phone": "Phone number",
  "pharm.phonePlaceholder": "e.g. +964 770 000 0000",
  "pharm.location": "Map location",
  "pharm.locationPlaceholder": "Address, coordinates, or a Google Maps link",
  "pharm.locationHint":
    "Paste an address, GPS coordinates (e.g. 33.3152, 44.3661), or a Google Maps link — a map preview appears on the card.",
  "pharm.notesPlaceholder": "Opening hours, contact person, delivery notes…",
  "pharm.savePharmacy": "Save pharmacy",
  "pharm.noLocation": "No location set",
  "pharm.none": "No pharmacies yet",
  "pharm.folderEmpty": "This folder is empty",
  "pharm.emptyHint": "Add a pharmacy to start building your directory board.",
  "pharm.mapTitle": "Map — {name}",

  // ── Visit map ──
  "map.title": "Visit map",
  "map.pinnedCount": "{pinned} of {total} pharmacies pinned",
  "map.needLocation": " — the rest need a location",
  "map.pinsDraggable": "Pins are draggable — click to lock",
  "map.pinsUnlock": "Unlock pins to drag them",
  "map.movingPins": "Moving pins",
  "map.pinsLocked": "Pins locked",
  "map.directory": "Directory",
  "map.searchPlaceholder": "Search pharmacies…",
  "map.nothingYet": "Nothing to show on the map yet",
  "map.nothingHint":
    "Add a location to your pharmacies — an address, GPS coordinates, or a Google Maps link — and they will appear here.",
  "map.goToPharmacies": "Go to pharmacies",
  "map.notPinned": "{n} not pinned",
  "map.locateAll": "Locate all",
  "map.findOnMap": "Find on the map",
  "map.addLocation": "Add a location",
  "map.directions": "Directions",
  "map.noMatch": "No pharmacies match this filter.",
  "map.fitAll": "Fit all pharmacies",
  "map.myLocation": "Show my location",
  "map.dragHint": "Drag the pin to correct it",
  "map.locateFailed":
    "Couldn't place \"{name}\" from \"{location}\". Try pasting a Google Maps link or coordinates on the Pharmacies page.",

  // ── Data-layer errors ──
  "err.codeExists": "Product code '{code}' already exists.",
  "err.codeInUse": "Product code '{code}' is already in use.",
  "err.productMissing": "Product not found.",
  "err.categoryExists": "Category name '{name}' already exists.",
  "err.categoryMissing": "Category not found.",
  "err.categoryHasProducts": "Cannot delete category containing products.",
  "err.loadPharmacies": "Failed to load pharmacies.",
  "err.savePharmacy": "Failed to save pharmacy.",
  "err.updatePharmacy": "Failed to update pharmacy.",
  "err.deletePharmacy": "Failed to delete pharmacy.",
  "err.loadFolders": "Failed to load folders.",
  "err.createFolder": "Failed to create folder.",
  "err.renameFolder": "Failed to rename folder.",
  "err.deleteFolder": "Failed to delete folder.",
  "err.placeOrder": "Failed to place order.",
  "err.loadOrders": "Failed to load orders.",
  "err.loadOrder": "Failed to load order.",
  "err.updateOrder": "Failed to update order.",
  "err.deleteOrder": "Failed to delete order.",
  "err.lookupFailed": "Lookup failed.",
  "err.saveOrder": "Failed to save order: {reason}",
  "err.nameRequired": "Product name is required.",
  "err.codeRequired": "Product code is required.",
  "err.priceInvalid": "Price must be a valid positive number.",
  "err.categoryRequired": "Please select a category.",
  "err.uploadFailed": "Failed to upload image",
  "err.saveGeneric": "An error occurred while saving.",
  "err.deleteProduct": "Failed to delete product.",
} as const;

/** Every translatable string in the app. */
export type MessageKey = keyof typeof en;

const ar: Record<MessageKey, string> = {
  // ── Shared vocabulary ──
  "common.cart": "السلة",
  "common.orders": "الطلبات",
  "common.myOrders": "طلباتي",
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
  "common.brand": "Pharmacy Line",

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
  "shop.eyebrow": "صيدلية · العناية بالبشرة · المكمّلات",
  "shop.headline1": "عافية يومية،",
  "shop.headline2": "مختارة بعناية.",
  "shop.lede":
    "تشكيلة منتقاة من المستحضرات الطبية ومنتجات العناية بالبشرة والمكمّلات الموثوقة — تصفّح المجموعة وجهّز طلبك بلمسات قليلة.",
  "shop.ctaShop": "تسوّق المجموعة",
  "shop.ctaBrowse": "تصفّح الأقسام",
  "shop.inCollection": "في المجموعة",
  "shop.productsInStock": "منتج متوفر",
  "shop.categories": "قسم",
  "shop.trustDelivery": "توصيل محلي سريع",
  "shop.trustAuthentic": "أصلي ومختوم",
  "shop.trustCurated": "تشكيلة منتقاة بعناية",
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
    "مستحضرات الصيدلية والعناية بالبشرة والعافية — مختارة وموصَّلة إليك.",
  "shop.copyright": "© 2026 Pharmacy Line — صيدلية وعافية. جميع الحقوق محفوظة.",
  "shop.staffLogin": "دخول الموظفين",
  "shop.browseCategories": "تسوّق حسب القسم",
  "shop.featured": "مختارات",
  "shop.seeAll": "عرض الكل",
  "shop.goodToSeeYou": "أهلاً بعودتك",

  // ── Install to home screen ──
  "app.installTitle": "ثبّت التطبيق",
  "app.installBody": "أضف Pharmacy Line إلى شاشتك الرئيسية — بملء الشاشة وبلمسة واحدة.",
  "app.installIos": "اضغط زر المشاركة، ثم «إضافة إلى الشاشة الرئيسية».",
  "app.install": "تثبيت",
  "app.notNow": "ليس الآن",

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
  "cart.generateReceipt": "إصدار الفاتورة",
  "cart.approveOrder": "تأكيد الطلب",
  "cart.checkout": "الدفع",

  // ── Order confirmation & history ──
  "confirm.title": "تم استلام الطلب",
  "confirm.subtitle": "تم استلام طلبك — سنؤكده قريباً",
  "confirm.order": "الطلب",
  "confirm.items": "المنتجات",
  "confirm.note": "ستراجع الصيدلية طلبك وتؤكده قريباً.",
  "confirm.continue": "متابعة التسوّق",
  "history.empty": "لا توجد طلبات بعد",
  "history.emptyHint": "ستظهر الطلبات التي تنشئها هنا.",

  // ── Receipt ──
  "receipt.eyebrow": "طبي · العناية بالبشرة · المكمّلات",
  "receipt.pendingBadge": "قيد المراجعة",
  "receipt.item": "المنتج",
  "receipt.amount": "المبلغ",
  "receipt.grandTotal": "المجموع الكلي",
  "receipt.pendingFooter": "— استلمنا طلبك وسنؤكده قريباً —",
  "receipt.thanks": "— شكراً لتسوّقك معنا —",
  "receipt.print": "طباعة",
  "receipt.saveImage": "حفظ كصورة",
  "receipt.whatsapp": "إرسال عبر واتساب",
  "receipt.backToShop": "العودة إلى المتجر",
  "receipt.newOrder": "طلب جديد",
  "receipt.backToOrders": "العودة إلى الطلبات",
  "receipt.saveFailed":
    "تعذّر حفظ الصورة على هذا الجهاز — يُرجى التقاط لقطة شاشة للفاتورة بدلاً من ذلك.",
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
    "لم تُضبط بيانات دخول للمسؤول على هذا الخادم، لذا تعمل البيانات الافتراضية المدمجة — وهي منشورة في الشيفرة المصدرية. اضبط ADMIN_EMAIL و ADMIN_PASSWORD في إعدادات الاستضافة.",

  // ── Admin shell ──
  "nav.overview": "نظرة عامة",
  "nav.newSale": "عملية بيع",
  "nav.products": "المنتجات",
  "nav.categories": "الأقسام",
  "nav.orders": "الطلبات",
  "nav.pharmacies": "الصيدليات",
  "nav.map": "خريطة الزيارات",
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
  "modal.category": "القسم",
  "modal.categoryAria": "قسم المنتج",
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
  "modal.benefitsPlaceholder": "ما الذي يساعد عليه — نقطة في كل سطر…",
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
    "لا يمكن حذف «{name}» — يحتوي على {n} منتج. انقلها أو احذفها أولاً.",

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
  "orders.deletePermanently": "حذف نهائي؟",
  "orders.yesDelete": "نعم، احذف",
  "orders.deleting": "جارٍ الحذف…",

  // ── Admin sale screen ──
  "sell.reviewOrder": "مراجعة الطلب #{n}",
  "sell.reviewHint": "عدّل المنتجات والهدايا والخصم — الحفظ يؤكد الطلب",
  "sell.newHint": "تتوفر الهدايا وتعديل الأسعار والخصومات",
  "sell.emptyCatalog": "لا توجد منتجات في الكتالوج",

  // ── Pharmacies ──
  "pharm.title": "الصيدليات",
  "pharm.subtitle": "لوحة الدليل — محفوظة في حسابك ومتزامنة على كل الأجهزة",
  "pharm.visitMap": "خريطة الزيارات",
  "pharm.addPharmacy": "إضافة صيدلية",
  "pharm.allPharmacies": "كل الصيدليات",
  "pharm.unfiled": "غير مصنّف",
  "pharm.newFolder": "مجلد جديد",
  "pharm.folderName": "اسم المجلد",
  "pharm.createFolder": "إنشاء مجلد",
  "pharm.renameFolder": "إعادة تسمية المجلد",
  "pharm.deleteFolder": "حذف المجلد",
  "pharm.newPharmacy": "صيدلية جديدة",
  "pharm.editPharmacy": "تعديل الصيدلية",
  "pharm.deletePharmacy": "حذف الصيدلية",
  "pharm.closeForm": "إغلاق النموذج",
  "pharm.name": "اسم الصيدلية",
  "pharm.namePlaceholder": "مثال: صيدلية الشفاء",
  "pharm.folder": "المجلد",
  "pharm.phone": "رقم الهاتف",
  "pharm.phonePlaceholder": "مثال: ‎+964 770 000 0000",
  "pharm.location": "الموقع على الخريطة",
  "pharm.locationPlaceholder": "عنوان أو إحداثيات أو رابط خرائط جوجل",
  "pharm.locationHint":
    "الصق عنواناً أو إحداثيات GPS (مثال: 33.3152, 44.3661) أو رابط خرائط جوجل — وستظهر معاينة الخريطة على البطاقة.",
  "pharm.notesPlaceholder": "ساعات العمل، الشخص المسؤول، ملاحظات التوصيل…",
  "pharm.savePharmacy": "حفظ الصيدلية",
  "pharm.noLocation": "لم يُحدَّد موقع",
  "pharm.none": "لا توجد صيدليات بعد",
  "pharm.folderEmpty": "هذا المجلد فارغ",
  "pharm.emptyHint": "أضف صيدلية لبدء بناء لوحة الدليل.",
  "pharm.mapTitle": "خريطة — {name}",

  // ── Visit map ──
  "map.title": "خريطة الزيارات",
  "map.pinnedCount": "{pinned} من {total} صيدلية محدَّدة على الخريطة",
  "map.needLocation": " — البقية بحاجة إلى موقع",
  "map.pinsDraggable": "يمكن سحب العلامات — اضغط للقفل",
  "map.pinsUnlock": "افتح القفل لسحب العلامات",
  "map.movingPins": "تحريك العلامات",
  "map.pinsLocked": "العلامات مقفلة",
  "map.directory": "الدليل",
  "map.searchPlaceholder": "ابحث عن صيدلية…",
  "map.nothingYet": "لا شيء لعرضه على الخريطة بعد",
  "map.nothingHint":
    "أضف موقعاً لصيدلياتك — عنوان أو إحداثيات GPS أو رابط خرائط جوجل — وستظهر هنا.",
  "map.goToPharmacies": "الذهاب إلى الصيدليات",
  "map.notPinned": "{n} غير محدَّدة",
  "map.locateAll": "تحديد الكل",
  "map.findOnMap": "البحث على الخريطة",
  "map.addLocation": "إضافة موقع",
  "map.directions": "الاتجاهات",
  "map.noMatch": "لا توجد صيدليات مطابقة لهذا الفلتر.",
  "map.fitAll": "إظهار كل الصيدليات",
  "map.myLocation": "إظهار موقعي",
  "map.dragHint": "اسحب العلامة لتصحيح موضعها",
  "map.locateFailed":
    "تعذّر تحديد «{name}» من «{location}». جرّب لصق رابط خرائط جوجل أو الإحداثيات في صفحة الصيدليات.",

  // ── Data-layer errors ──
  "err.codeExists": "رمز المنتج '{code}' موجود مسبقاً.",
  "err.codeInUse": "رمز المنتج '{code}' مستخدم بالفعل.",
  "err.productMissing": "المنتج غير موجود.",
  "err.categoryExists": "اسم القسم '{name}' موجود مسبقاً.",
  "err.categoryMissing": "القسم غير موجود.",
  "err.categoryHasProducts": "لا يمكن حذف قسم يحتوي على منتجات.",
  "err.loadPharmacies": "تعذّر تحميل الصيدليات.",
  "err.savePharmacy": "تعذّر حفظ الصيدلية.",
  "err.updatePharmacy": "تعذّر تحديث الصيدلية.",
  "err.deletePharmacy": "تعذّر حذف الصيدلية.",
  "err.loadFolders": "تعذّر تحميل المجلدات.",
  "err.createFolder": "تعذّر إنشاء المجلد.",
  "err.renameFolder": "تعذّر إعادة تسمية المجلد.",
  "err.deleteFolder": "تعذّر حذف المجلد.",
  "err.placeOrder": "تعذّر إرسال الطلب.",
  "err.loadOrders": "تعذّر تحميل الطلبات.",
  "err.loadOrder": "تعذّر تحميل الطلب.",
  "err.updateOrder": "تعذّر تحديث الطلب.",
  "err.deleteOrder": "تعذّر حذف الطلب.",
  "err.lookupFailed": "فشل البحث.",
  "err.saveOrder": "تعذّر حفظ الطلب: {reason}",
  "err.nameRequired": "اسم المنتج مطلوب.",
  "err.codeRequired": "رمز المنتج مطلوب.",
  "err.priceInvalid": "يجب أن يكون السعر رقماً موجباً صحيحاً.",
  "err.categoryRequired": "يُرجى اختيار قسم.",
  "err.uploadFailed": "تعذّر رفع الصورة",
  "err.saveGeneric": "حدث خطأ أثناء الحفظ.",
  "err.deleteProduct": "تعذّر حذف المنتج.",
};

const MESSAGES: Record<Lang, Record<MessageKey, string>> = { en, ar };

/** Values substituted into {placeholders}. */
export type Vars = Record<string, string | number>;

function format(template: string, vars?: Vars): string {
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
