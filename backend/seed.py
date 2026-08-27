from sqlalchemy.orm import Session
from models import Category, Product

# Mapping of categories and their display orders
CATEGORIES = {
    "Kahi & Medicube Care": {
        "display_order": 1,
        "products": [
            {"name": "تونر Kahi", "code": "B1", "price": 18000, "image_url": "/products/B1.jpg"},
            {"name": "ستاك Kahi", "code": "B2", "price": 18000, "image_url": "/products/B2.jpg"},
            {"name": "ميديكيوب سيروم الكولاجين", "code": "B3", "price": 18000, "image_url": "/products/B3.jpg"},
            {"name": "ميديكيوب كريم كولاجين", "code": "B4", "price": 16500, "image_url": "/products/B4.jpg"},
            {"name": "ميديكيوب كريم نياساميد", "code": "B5", "price": 18000, "image_url": "/products/B5.jpg"},
            {"name": "سيروم ميديكيوب نياساميد", "code": "B6", "price": 16500, "image_url": "/products/B6.jpg"},
            {"name": "ميديكيوب واقي شمس كولاجين", "code": "B7", "price": 15000, "image_url": "/products/B7.jpg"},
            {"name": "ميديكيوب عصارة سيروم الكولاجين", "code": "B8", "price": 15000, "image_url": "/products/B8.jpg"},
            {"name": "ميديكيوب capsule cream", "code": "B9", "price": 18000, "image_url": "/products/B9.jpg"},
            {"name": "ميديكيوب امبول البشرة", "code": "B10", "price": 15000, "image_url": "/products/B10.jpg"},
            {"name": "كريم ميديكيوب zero", "code": "B11", "price": 18000, "image_url": "/products/B11.jpg"},
            {"name": "سيروم ميديكيوب Zero", "code": "B12", "price": 16500, "image_url": "/products/B12.jpg"},
            {"name": "ماسك ميديكيوب zero", "code": "B13", "price": 16500, "image_url": "/products/B13.jpg"},
            {"name": "ميديكيوب واقي شمس", "code": "B14", "price": 15000, "image_url": "/products/B14.jpg"},
            {"name": "ميديكيوب غسول حب الشباب", "code": "B15", "price": 18000, "image_url": "/products/B15.jpg"},
            {"name": "ماسك ميديكيوب الليلي", "code": "B17", "price": 15000, "image_url": "/products/B17.jpg"},
        ]
    },
    "Numbuzin & Dr. Althea & Dr. Melaxin": {
        "display_order": 2,
        "products": [
            {"name": "جل ميديكيوب قناع وجه", "code": "B16", "price": 21000, "image_url": "/products/B16.jpg"},
            {"name": "سيروم لشد البشرة numpazin +9", "code": "B18", "price": 16500, "image_url": "/products/B18.jpg"},
            {"name": "كريم العين numpazin +9", "code": "B19", "price": 18000, "image_url": "/products/B19.jpg"},
            {"name": "سيروم 4+ / 3+ numpazin", "code": "B20", "price": 15000, "image_url": "/products/B20.jpg"},
            {"name": "تونر numpazin +9", "code": "B21", "price": 16500, "image_url": "/products/B21.jpg"},
            {"name": "عصارة 345", "code": "B34", "price": 15000, "image_url": "/products/B34.jpg"},
            {"name": "عصارة 147", "code": "B35", "price": 15000, "image_url": "/products/B35.jpg"},
            {"name": "كريم العين دكتور الثيا", "code": "B36", "price": 18000, "image_url": "/products/B36.jpg"},
            {"name": "سيروم دكتور الثيا", "code": "B37", "price": 15000, "image_url": "/products/B37.jpg"},
            {"name": "بلسم دكتور الثيا", "code": "B38", "price": 16500, "image_url": "/products/B38.jpg"},
            {"name": "عصارة غسول دكتور الثيا", "code": "B39", "price": 16500, "image_url": "/products/B39.jpg"},
            {"name": "كريم دكتور الثيا لتفتيح البشرة", "code": "B40", "price": 18000, "image_url": "/products/B40.jpg"},
            {"name": "سيروم تفتيح البشرة Dr. melaxin", "code": "B100", "price": 15000, "image_url": "/products/B100.jpg"},
            {"name": "غسول Dr. melaxin", "code": "B180", "price": 16500, "image_url": "/products/B180.jpg"},
            {"name": "كريم لعلاج التصبغات والبقع الداكنة Dr. melaxin", "code": "B181", "price": 15000, "image_url": "/products/B181.jpg"},
            {"name": "مقشر black rice Dr. melaxin", "code": "B182", "price": 18000, "image_url": "/products/B182.jpg"},
            {"name": "مقشر rice Dr. melaxin", "code": "B183", "price": 18000, "image_url": "/products/B183.jpg"},
            {"name": "كريم لعلاج حب الشباب Dr. melaxin", "code": "B185", "price": 16500, "image_url": "/products/B185.jpg"},
            {"name": "كريم لتخليص المسام Dr. melaxin", "code": "B186", "price": 15000, "image_url": "/products/B186.jpg"},
        ]
    },
    "Eucerin & Neutrogena Skincare": {
        "display_order": 3,
        "products": [
            {"name": "لوشن يوسرين PH5", "code": "B22", "price": 21000, "image_url": "/products/B22.jpg"},
            {"name": "لوشن يوسرين Roughness Relief", "code": "B23", "price": 18000, "image_url": "/products/B23.jpg"},
            {"name": "لوشن يوسرين urea Repair plus", "code": "B24", "price": 21000, "image_url": "/products/B24.jpg"},
            {"name": "لوشن يوسرين spotless", "code": "B25", "price": 18000, "image_url": "/products/B25.jpg"},
            {"name": "سيروم يوسرين spotless", "code": "B26", "price": 21000, "image_url": "/products/B26.jpg"},
            {"name": "سيروم يوسرين Anti-Pigment", "code": "B27", "price": 21000, "image_url": "/products/B27.jpg"},
            {"name": "واقي شمس يوسرين Pigment Control", "code": "B28", "price": 16500, "image_url": "/products/B28.jpg"},
            {"name": "كريم يوسرين Roughness Relief", "code": "B29", "price": 19500, "image_url": "/products/B29.jpg"},
            {"name": "كريم يوسرين Gel cream", "code": "B30", "price": 18000, "image_url": "/products/B30.jpg"},
            {"name": "كريم يوسرين Daily cream", "code": "B31", "price": 18000, "image_url": "/products/B31.jpg"},
            {"name": "كريم نايتروجين Hydro Boost", "code": "B32", "price": 12000, "image_url": "/products/B32.jpg"},
            {"name": "كريم يوسرين Q10", "code": "B33", "price": 18000, "image_url": "/products/B33.jpg"},
        ]
    },
    "La Roche-Posay": {
        "display_order": 4,
        "products": [
            {"name": "عصارة لاروش آثار جروح", "code": "B41", "price": 12000, "image_url": "/products/B41.jpg"},
            {"name": "غسول لاروش 400 ml", "code": "B42", "price": 15000, "image_url": "/products/B42.jpg"},
            {"name": "غسول لاروش 200 ml", "code": "B43", "price": 12750, "image_url": "/products/B43.jpg"},
            {"name": "عصارة لاروش Effaclar unifiant", "code": "B44", "price": 11250, "image_url": "/products/B44.jpg"},
            {"name": "عصارة لاروش Effaclar", "code": "B45", "price": 11250, "image_url": "/products/B45.jpg"},
            {"name": "كريم لاروش Nutritic Intense", "code": "B46", "price": 15000, "image_url": "/products/B46.jpg"},
            {"name": "غسول لاروش B3 200 ml", "code": "B47", "price": 13500, "image_url": "/products/B47.jpg"},
            {"name": "سيروم لاروش (جميع الانواع)", "code": "B48", "price": 7500, "image_url": "/products/B48.jpg"},
            {"name": "واقي شمس لاروش", "code": "B49", "price": 11250, "image_url": "/products/B49.jpg"},
            {"name": "واقي شمس لاروش مائي", "code": "B50", "price": 12000, "image_url": "/products/B50.jpg"},
        ]
    },
    "Beauty of Joseon": {
        "display_order": 5,
        "products": [
            {"name": "كريم بيوتي اوف جوسن الكوري", "code": "B51", "price": 15000, "image_url": "/products/B51.jpg"},
            {"name": "واقي شمس بيوتي اوف جوسن", "code": "B52", "price": 15000, "image_url": "/products/B52.jpg"},
            {"name": "واقي شمس بيوتي اوف جوسن الاصدار الجديد", "code": "B53", "price": 15000, "image_url": "/products/B53.jpg"},
            {"name": "سيروم بيوتي اوف جوسن الكوري", "code": "B54", "price": 13500, "image_url": "/products/B54.jpg"},
            {"name": "تونر بيوتي اوف جوسن", "code": "B55", "price": 15000, "image_url": "/products/B55.jpg"},
            {"name": "غسول بيوتي اوف جوسن الزيتي الكوري", "code": "B56", "price": 15000, "image_url": "/products/B56.jpg"},
            {"name": "كريم ترطيب الهاليرونيك من كوزركس الكورية", "code": "B57", "price": 13500, "image_url": "/products/B57.jpg"},
        ]
    },
    "SKIN1004 Madagascar Centella": {
        "display_order": 6,
        "products": [
            {"name": "Centella hyalu-cica first ampoule", "code": "B217", "price": 15000, "image_url": "/products/B217.jpg"},
            {"name": "Centella Tea-Trica", "code": "B218", "price": 15000, "image_url": "/products/B218.jpg"},
            {"name": "centella pro bio-cica", "code": "B219", "price": 15000, "image_url": "/products/B219.jpg"},
            {"name": "Centella Poremizing Fresh Ampoule", "code": "B220", "price": 15000, "image_url": "/products/B220.jpg"},
            {"name": "Centella Ampoule Foam", "code": "B221", "price": 15000, "image_url": "/products/B221.jpg"},
            {"name": "Centella tone brightening ampoule", "code": "B222", "price": 15000, "image_url": "/products/B222.jpg"},
            {"name": "Centella serum", "code": "B223", "price": 15000, "image_url": "/products/B223.jpg"},
            {"name": "Centella cream", "code": "B224", "price": 15000, "image_url": "/products/B224.jpg"},
            {"name": "Centella Toner", "code": "B225", "price": 15000, "image_url": "/products/B225.jpg"},
            {"name": "واقي شمس Centela", "code": "B226", "price": 15000, "image_url": "/products/B226.jpg"},
            {"name": "بكج فوم + غسول Centela", "code": "B227", "price": 24000, "image_url": "/products/B227.jpg"},
            {"name": "بكج مني Centela", "code": "B229", "price": 15000, "image_url": "/products/B229.jpg"},
        ]
    },
    "Kojic Acid & Specialty Soaps": {
        "display_order": 7,
        "products": [
            {"name": "صابون كوجك اسيد", "code": "B58", "price": 5250, "image_url": "/products/B58.jpg"},
            {"name": "مقشر كوجك اسيد", "code": "B59", "price": 5250, "image_url": "/products/B59.jpg"},
            {"name": "غسول كوجك اسيد", "code": "B60", "price": 5250, "image_url": "/products/B60.jpg"},
            {"name": "واقي شمس كوجك اسيد", "code": "B61", "price": 5250, "image_url": "/products/B61.jpg"},
            {"name": "غسول فرشاة كوجك اسيد", "code": "B62", "price": 4500, "image_url": "/products/B62.jpg"},
            {"name": "body lotion كوجك اسيد", "code": "B63", "price": 6750, "image_url": "/products/B63.jpg"},
            {"name": "صابون سكينورين ازليلايك اسيد 20%", "code": "B121", "price": 7500, "image_url": "/products/B121.jpg"},
            {"name": "صابون بيأنثين", "code": "B123", "price": 6000, "image_url": "/products/B123.jpg"},
            {"name": "غسول رفيولي", "code": "B184", "price": 12000, "image_url": "/products/B184.jpg"},
        ]
    },
    "COSRX & Avène & OZ Naturals": {
        "display_order": 8,
        "products": [
            {"name": "غسول افين 400 ml", "code": "B64", "price": 15000, "image_url": "/products/B64.jpg"},
            {"name": "واقي شمس افين", "code": "B65", "price": 6000, "image_url": "/products/B65.jpg"},
            {"name": "سيروم OZ Plump", "code": "B66", "price": 6000, "image_url": "/products/B66.jpg"},
            {"name": "سيروم OZ Glow VC", "code": "B67", "price": 6000, "image_url": "/products/B67.jpg"},
            {"name": "سيروم كوزركس retinol 0.5", "code": "B68", "price": 15000, "image_url": "/products/B68.jpg"},
            {"name": "سيروم كوزركس C23", "code": "B69", "price": 15000, "image_url": "/products/B69.jpg"},
            {"name": "صابون كوزركس", "code": "B70", "price": 4500, "image_url": "/products/B70.jpg"},
            {"name": "كريم الحلزون الكوري كوزركس", "code": "B71", "price": 16500, "image_url": "/products/B71.jpg"},
            {"name": "كريم ترطيب الهاليرونيك من كوزركس الكورية", "code": "B72", "price": 16500, "image_url": "/products/B72.jpg"},
            {"name": "لاصقات حب الشباب كوزركس", "code": "B73", "price": 4500, "image_url": "/products/B73.jpg"},
            {"name": "عصارة غسول الحلزون كوزركس", "code": "B74", "price": 15000, "image_url": "/products/B74.jpg"},
            {"name": "كوزركس عصارة بالساليسیليك أسيد كوري", "code": "B75", "price": 13500, "image_url": "/products/B75.jpg"},
            {"name": "كزركس غسول جل الكوري الصباحي", "code": "B76", "price": 13500, "image_url": "/products/B76.jpg"},
            {"name": "كوزركس واقي شمس بخلاصة الصبار", "code": "B77", "price": 15000, "image_url": "/products/B77.jpg"},
            {"name": "تونر الحلزون الكوري", "code": "B78", "price": 16500, "image_url": "/products/B78.jpg"},
            {"name": "كريم العين كوزركس", "code": "B79", "price": 15000, "image_url": "/products/B79.jpg"},
        ]
    },
    "Celimax & Vichy": {
        "display_order": 9,
        "products": [
            {"name": "سيروم ريتينال شوت", "code": "B80", "price": 15000, "image_url": "/products/B80.jpg"},
            {"name": "عصارة ريتينال شوت", "code": "B81", "price": 12000, "image_url": "/products/B81.jpg"},
            {"name": "سيروم celimax Pore + Dark Spot", "code": "B82", "price": 16500, "image_url": "/products/B82.jpg"},
            {"name": "سيروم celimax Noni Ampoule", "code": "B83", "price": 15000, "image_url": "/products/B83.jpg"},
            {"name": "ماسك celimax", "code": "B84", "price": 16500, "image_url": "/products/B84.jpg"},
            {"name": "كريم العين celimax", "code": "B85", "price": 13500, "image_url": "/products/B85.jpg"},
            {"name": "كريم لتفتيح البقع الداكنة celimax", "code": "B86", "price": 18000, "image_url": "/products/B86.jpg"},
            {"name": "واقي شمس celimax", "code": "B87", "price": 15000, "image_url": "/products/B87.jpg"},
            {"name": "كريم Vichy lift active", "code": "B88", "price": 18000, "image_url": "/products/B88.jpg"},
            {"name": "جل Vichy lift active", "code": "B89", "price": 21000, "image_url": "/products/B89.jpg"},
            {"name": "شامبو Vichy Stimulant", "code": "B90", "price": 21000, "image_url": "/products/B90.jpg"},
            {"name": "شامبو Vichy Traitant", "code": "B91", "price": 21000, "image_url": "/products/B91.jpg"},
            {"name": "سيروم Vichy mineral 89", "code": "B92", "price": 18000, "image_url": "/products/B92.jpg"},
            {"name": "كريم Vichy mineral 89", "code": "B93", "price": 18000, "image_url": "/products/B93.jpg"},
            {"name": "بخاخ الشعر Vichy", "code": "B94", "price": 15000, "image_url": "/products/B94.jpg"},
            {"name": "تونر Vichy Normaderm", "code": "B95", "price": 15000, "image_url": "/products/B95.jpg"},
            {"name": "تونر Vichy Purete thermale", "code": "B96", "price": 15000, "image_url": "/products/B96.jpg"},
            {"name": "غسول Vichy Normaderm", "code": "B97", "price": 18000, "image_url": "/products/B97.jpg"},
        ]
    },
    "The Ordinary & AXIS-Y": {
        "display_order": 10,
        "products": [
            {"name": "سيروم اوردنري هالورنيك اسيد", "code": "B106", "price": 15000, "image_url": "/products/B106.jpg"},
            {"name": "سيروم اوردنري ريتنول", "code": "B107", "price": 15000, "image_url": "/products/B107.jpg"},
            {"name": "سيروم اوردنري حمض اللاكتيك", "code": "B108", "price": 15000, "image_url": "/products/B108.jpg"},
            {"name": "سيروم اوردنري الكافيين", "code": "B109", "price": 15000, "image_url": "/products/B109.jpg"},
            {"name": "سيروم اوردنري نيساميد + زنك", "code": "B110", "price": 15000, "image_url": "/products/B110.jpg"},
            {"name": "سيروم اوردنري مقشر", "code": "B111", "price": 15000, "image_url": "/products/B111.jpg"},
            {"name": "سيروم اوردنري الفا اربوتين", "code": "B112", "price": 15000, "image_url": "/products/B112.jpg"},
            {"name": "واقي شمس اوردنري", "code": "B113", "price": 12000, "image_url": "/products/B113.jpg"},
            {"name": "تونر اوردنري", "code": "B114", "price": 15000, "image_url": "/products/B114.jpg"},
            {"name": "غسول axis - y", "code": "B115", "price": 15000, "image_url": "/products/B115.jpg"},
            {"name": "واقي شمس axis - y dark spot", "code": "B116", "price": 15000, "image_url": "/products/B116.jpg"},
            {"name": "كريم العين axis - y", "code": "B117", "price": 15000, "image_url": "/products/B117.jpg"},
            {"name": "تونر axis - y", "code": "B118", "price": 15000, "image_url": "/products/B118.jpg"},
            {"name": "سيروم axis - y", "code": "B119", "price": 15000, "image_url": "/products/B119.jpg"},
            {"name": "كريم وجه axis - y", "code": "B120", "price": 15000, "image_url": "/products/B120.jpg"},
        ]
    },
    "Hair & Body Care": {
        "display_order": 11,
        "products": [
            {"name": "غسول Seoul 1988", "code": "B187", "price": 16500, "image_url": "/products/B187.jpg"},
            {"name": "سيروم Seoul 1988", "code": "B188", "price": 15000, "image_url": "/products/B188.jpg"},
            {"name": "كريم العين Seoul 1988", "code": "B189", "price": 15000, "image_url": "/products/B189.jpg"},
            {"name": "كريم Seoul 1988", "code": "B190", "price": 18000, "image_url": "/products/B190.jpg"},
            {"name": "Bio-Oil", "code": "B228", "price": 10500, "image_url": "/products/B228.jpg"},
            {"name": "واقي شمس ازدن", "code": "B230", "price": 15000, "image_url": "/products/B230.jpg"},
            {"name": "واقي شمس UV", "code": "B231", "price": 9000, "image_url": "/products/B231.jpg"},
            {"name": "شامبو اكليل الجبل", "code": "B232", "price": 11250, "image_url": "/products/B232.jpg"},
            {"name": "مكيف اكليل الجبل", "code": "B233", "price": 6750, "image_url": "/products/B233.jpg"},
            {"name": "سيروم اكليل الجبل", "code": "B234", "price": 11250, "image_url": "/products/B234.jpg"},
            {"name": "شامبو فينو", "code": "B235", "price": 11250, "image_url": "/products/B235.jpg"},
            {"name": "مكيف فينو", "code": "B236", "price": 11250, "image_url": "/products/B236.jpg"},
            {"name": "ماسك اكليل الجبل", "code": "B237", "price": 9000, "image_url": "/products/B237.jpg"},
            {"name": "بخاخ معالج فينو", "code": "B238", "price": 10500, "image_url": "/products/B238.jpg"},
            {"name": "ماسك فينو", "code": "B239", "price": 11250, "image_url": "/products/B239.jpg"},
            {"name": "كريم QV", "code": "B240", "price": 12000, "image_url": "/products/B240.jpg"},
            {"name": "كريم QV الاصدار الجديد", "code": "B241", "price": 12000, "image_url": "/products/B241.jpg"},
            {"name": "كريم QV flare", "code": "B242", "price": 11250, "image_url": "/products/B242.jpg"},
            {"name": "Skin Lotion QV", "code": "B243", "price": 13500, "image_url": "/products/B243.jpg"},
            {"name": "Lotion QV", "code": "B244", "price": 13500, "image_url": "/products/B244.jpg"},
            {"name": "loshen QV الاصدار الجديد", "code": "B245", "price": 13500, "image_url": "/products/B245.jpg"},
            {"name": "تونر Bio-Derma", "code": "B290", "price": 15000, "image_url": "/products/B290.jpg"},
            {"name": "غسول Bio-Derma", "code": "B291", "price": 18000, "image_url": "/products/B291.jpg"},
            {"name": "كريم العين some by mi", "code": "B294", "price": 13500, "image_url": "/products/B294.jpg"},
            {"name": "سيروم some by mi", "code": "B295", "price": 16500, "image_url": "/products/B295.jpg"},
            {"name": "سيروم Eqqual berry", "code": "B301", "price": 13500, "image_url": "/products/B301.jpg"},
        ]
    },
}

def seed_database(db: Session) -> None:
    """Seed the database with initial product data if empty."""
    if db.query(Category).count() > 0:
        print("[INFO] Database already contains category data. Skipping seeding.")
        return

    for cat_name, cat_data in CATEGORIES.items():
        category = Category(name=cat_name, display_order=cat_data["display_order"])
        db.add(category)
        db.flush()

        for prod in cat_data["products"]:
            product = Product(
                name=prod["name"],
                code=prod["code"],
                price=prod["price"],
                image_url=prod["image_url"],
                category_id=category.id,
            )
            db.add(product)

    db.commit()
    print("[OK] Database seeded with new product catalog and photo references.")
