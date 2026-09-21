import { drizzle } from "drizzle-orm/mysql2";
import crypto from "crypto";
import { games, supportLinks, activationCodes, siteSettings } from "../drizzle/schema";

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is missing");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  console.log("Seeding games...");
  const initialGames = [
    {
      slug: "trivia-showdown",
      name: "تحدي المعلومات (Trivia)",
      description: "لعبة ثقافية جماعية تفاعلية لاختبار سرعة البديهة والذكاء بين الأصدقاء مع نقاط وترتيب مباشر.",
      imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
      gameUrl: "",
      isActive: true,
      isLocked: false,
      minPlayers: 2,
      maxPlayers: 8,
      sortOrder: 1,
    },
    {
      slug: "speed-words",
      name: "حروف وكلمات سريعة",
      description: "لعبة تحدي الحروف العربية والكلمات المبتكرة ضد الوقت في جولات حماسية ومباشرة.",
      imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
      gameUrl: "",
      isActive: true,
      isLocked: false,
      minPlayers: 2,
      maxPlayers: 8,
      sortOrder: 2,
    },
    {
      slug: "imposter-secret",
      name: "المندس (The Imposter)",
      description: "لعبة ذكاء واستنتاج اجتماعي لكشف اللاعب المندس بين الجميع بطرح أسئلة ذكية وخداع ممتع.",
      imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80",
      gameUrl: "",
      isActive: true,
      isLocked: false,
      minPlayers: 3,
      maxPlayers: 8,
      sortOrder: 3,
    },
    {
      slug: "mind-master-vip",
      name: "تحدي النخبة (VIP Arena)",
      description: "بطولة الأسئلة الاستراتيجية النادرة للأصدقاء والتجمعات الخاصة. تتطلب كود اشتراك معتمد.",
      imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80",
      gameUrl: "",
      isActive: true,
      isLocked: true,
      minPlayers: 2,
      maxPlayers: 10,
      sortOrder: 4,
    },
  ];

  for (const g of initialGames) {
    try {
      await db.insert(games).values(g).onDuplicateKeyUpdate({ set: g });
    } catch (e) {
      console.log("Game insert note:", e);
    }
  }

  console.log("Seeding support channels...");
  const initialSupport = [
    {
      platform: "discord",
      title: "مجتمع NoL على Discord",
      url: "https://discord.gg/example-nol",
      icon: "MessageSquare",
      isActive: true,
      sortOrder: 1,
    },
    {
      platform: "telegram",
      title: "قناة التحديثات على Telegram",
      url: "https://t.me/example_nol",
      icon: "Send",
      isActive: true,
      sortOrder: 2,
    },
    {
      platform: "whatsapp",
      title: "الدعم السريع عبر WhatsApp",
      url: "https://wa.me/1234567890",
      icon: "PhoneCall",
      isActive: true,
      sortOrder: 3,
    },
  ];

  for (const s of initialSupport) {
    try {
      await db.insert(supportLinks).values(s).onDuplicateKeyUpdate({ set: s });
    } catch (e) {
      console.log("Support insert note:", e);
    }
  }

  console.log("Seeding activation codes...");
  const sampleCodes = [
    { code: "NOL-7K29-XP41", days: 30 },
    { code: "NOL-VIP9-2026", days: 90 },
    { code: "NOL-TEST-FREE", days: 7 },
  ];

  for (const item of sampleCodes) {
    const codeHash = crypto.createHash("sha256").update(item.code.toUpperCase()).digest("hex");
    try {
      await db.insert(activationCodes).values({
        codeHash,
        codeDisplayPrefix: item.code.substring(0, 8),
        durationDays: item.days,
        status: "unused",
        createdBy: "admin",
      }).onDuplicateKeyUpdate({ set: { status: "unused" } });
    } catch (e) {
      console.log("Code insert note:", e);
    }
  }

  console.log("Seeding site settings...");
  await db.insert(siteSettings).values({
    key: "general",
    value: {
      siteName: "NoL",
      tagline: "ألعاب جماعية فورية بدون حسابات",
      sessionDurationHours: 6,
      roomInactivityMinutes: 30,
      maxRoomCapacity: 12,
    },
  }).onDuplicateKeyUpdate({
    set: {
      value: {
        siteName: "NoL",
        tagline: "ألعاب جماعية فورية بدون حسابات",
        sessionDurationHours: 6,
        roomInactivityMinutes: 30,
        maxRoomCapacity: 12,
      },
    },
  });

  console.log("Seed completed successfully!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
