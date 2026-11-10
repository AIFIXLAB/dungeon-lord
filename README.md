# DUNGEON LORD: MONSTER EMPIRE — Prototype v0.3

เกม Pixel Art Top-down Dungeon Management เล่นบนเบราว์เซอร์ (HTML5 Canvas + JavaScript ES Modules ไม่ต้อง build)
Deploy บน Vercel ได้ทันที และบันทึกเกมด้วย **รหัส 4 ตัว** ผ่าน `/api/save`

> หมายเหตุ: GDD กำหนด Godot 4 แต่คุณเลือกให้เล่นบน Vercel จึงทำเป็นเกมเว็บ โครงสร้าง Manager / Data-driven / Balance Config ยึดตาม GDD §31–33 เพื่อย้ายไป Godot ภายหลังได้

---

## Deploy บน Vercel

1. อัปโหลดโฟลเดอร์นี้ขึ้น GitHub แล้ว Import Project ใน Vercel (Framework Preset: **Other**, ไม่ต้องตั้ง Build Command)
   หรือใช้ CLI: `npx vercel` ในโฟลเดอร์นี้
2. เปิดระบบเซฟด้วยรหัส: Vercel Dashboard → โปรเจกต์ → **Storage** → Marketplace → **Upstash for Redis** → Create → Connect กับโปรเจกต์
   Vercel จะเพิ่ม `KV_REST_API_URL` และ `KV_REST_API_TOKEN` ให้อัตโนมัติ (ใช้ `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` ได้เช่นกัน)
3. Redeploy — ในเกม เมนู "บันทึก" จะขึ้น "● เชื่อมต่อคลาวด์"

ถ้ายังไม่ได้ต่อฐานข้อมูล เกมยังเล่นได้ปกติ และรหัส 4 ตัวจะบันทึกในเบราว์เซอร์เครื่องนั้นแทน (เกมแจ้งสถานะให้เห็น)

### ความปลอดภัยของรหัส
- รหัสใช้ A–Z และ 2–9 (ไม่มี I/O/0/1) = 1,048,576 แบบ, สร้างด้วย `SET NX` จึงไม่ชนกับคนอื่น
- รหัสคือรหัสผ่าน: ใครรู้รหัสก็โหลด/บันทึกทับได้ เหมาะกับเกม ไม่เหมาะกับข้อมูลสำคัญ
- เซิร์ฟเวอร์ตรวจ checksum, จำกัดขนาด 900KB, จำกัด 60 ครั้ง/นาที/IP และเก็บเวอร์ชันก่อนหน้าไว้ที่ `dlme:save:CODE:prev`

## รันในเครื่อง / ทดสอบ

```bash
node tests/devserver.mjs        # http://localhost:5173 (มี /api/save + Redis จำลอง)
node tests/sim.test.mjs         # ทดสอบ headless: จำลองเล่นจริงจนถึง Dungeon Level 2, Save/Load, Evolution ฯลฯ
node tests/long.test.mjs 90     # บอทเล่น 90 วัน (ทดสอบแล้วถึง Lv4 ไม่มี error)
node tests/browser.test.mjs     # ทดสอบผ่าน Chrome จริง (ต้องมี playwright และเปิด devserver ก่อน)
```

## วิธีเล่นย่อ

- ผู้กล้าเดินเข้าทางซ้าย (IN) ไปหา **Dungeon Core** (คริสตัลม่วง) — Core แตก = Defeat (เลือกฟื้นฟูแล้วเล่นต่อได้)
- มอนสเตอร์ "เฝ้า" ห้องที่ได้รับมอบหมาย ช่วยกันทั้งห้องเมื่อมีผู้กล้าบุก และวิ่งไปช่วยเมื่อ Core ถูกโจมตี
- ทีมทำความสะอาดเก็บ Loot เข้าคลัง (ต้องมีที่ว่าง) และกำจัดศพ/เลือด ห้องสกปรกทำให้ชื่อเสียงและ Loyalty ลด
- เที่ยงคืน: จ่ายค่าบำรุง ให้อาหาร บันทึกอัตโนมัติ และอาจเกิด Random Event
- คีย์ลัด: Space หยุด/เล่น · 1/2/3 ความเร็ว · WASD เลื่อนกล้อง · ล้อเมาส์ซูม · R หมุนห้อง · Esc ยกเลิก/ปิด
- iPad/มือถือ: ลากนิ้วเดียวเพื่อเลื่อนแผนที่ · ในโหมดวางห้อง/กับดัก **ลากตัวห้องไปวาง** แล้วกด "✔ สร้างที่นี่" (หรือแตะห้องซ้ำ) · สองนิ้วเลื่อน/ซูมแผนที่

---

## โครงสร้างโปรเจกต์

```
index.html, style.css          หน้าเกมและ UI แบบหน้าต่าง JRPG
api/save.js                    Vercel Function: บันทึก/โหลดด้วยรหัส 4 ตัว (Upstash Redis REST)
src/config/balance.js          ค่าสมดุลทั้งหมดของเกม (GDD §33) — ไฟล์เดียว
src/data/                      ข้อมูลแบบ Data-driven: monsters, heroes, rooms, items, skills, traps, levels, events, elements
src/core/                      RNG แบบ seed, EventBus, A* movement
src/managers/                  GameManager, DungeonManager, MonsterManager, HeroManager, CombatManager, CleaningManager,
                               TrainingManager, InventoryManager, EconomyManager, ProgressionManager, EventManager,
                               TimeManager, SaveManager, AudioManager
src/render/                    sprites.js (Pixel Art 16x16 จากข้อความ), Renderer.js (Canvas, กล้อง, Animation)
src/ui/UI.js                   UIManager: Top Bar, เมนู, Detail, Modal, Tooltip, Input
tests/                         sim.test.mjs, browser.test.mjs, devserver.mjs
```

เพิ่มมอนสเตอร์ใหม่: เพิ่มหนึ่งบรรทัดใน `TABLE` ของ `src/data/monsters.js` และ sprite ใน `assets/sprites/atlas.json` — ไม่ต้องแก้ระบบหลัก

```
assets/sprites/   heroes.png monsters.png bosses.png + atlas.json  (ตัดจาก sprite sheet ที่ส่งมา ลบพื้นหลังอัตโนมัติ)
assets/rooms/     ภาพห้อง 21 ห้อง ย่อเหลือ 320px (.webp) จาก PNG 1000px
src/data/heroes.js    ผู้กล้า 60 คลาส (Hero Class Design Bible)
src/data/monsters.js  มอนสเตอร์ 110 ชนิด + ห่วงโซ่วิวัฒนาการ + Mutation (Monster System Design Bible)
src/data/bosses.js    บอส 50 ตัว 5 ระดับ
src/managers/FusionManager.js  ระบบ Fusion
```

ภาพห้องเป็นภาพตกแต่งเท่านั้น พื้นที่เดินได้ / ทางเข้าออก / ชน ใช้ข้อมูล Tile แยกต่างหาก (ตามข้อกำหนดข้อ 5, 12 ของเอกสารห้อง)

---

## สถานะระบบเทียบกับ GDD

ทดสอบแล้ว = ผ่าน `tests/sim.test.mjs` (75 ข้อ) + `tests/touch.test.mjs` (จำลอง iPad: ลากวางห้อง, สองนิ้วเลื่อน/ซูม), `tests/long.test.mjs` (บอท 100 วันถึง Lv4) และ/หรือ `tests/browser.test.mjs` (ผ่าน UI จริงใน Chrome)

| ระบบ (Prototype v0.1 §35) | สถานะ |
|---|---|
| แผนที่ Top-down เริ่ม 22x20 ขยายได้ถึง 64x48, ห้องขนาดใหญ่ขึ้น (4x4–7x7), วางห้องทับทางเดินได้ | ✅ ทดสอบแล้ว |
| ผู้กล้าผันผวนรายวัน: วันเงียบ/ปกติ/คึกคัก/บุกหนัก, ปาร์ตี้ใหญ่สุด 8, คลื่นต่อเนื่อง, เพิ่มตามจำนวนวันที่อยู่รอด | ✅ ทดสอบแล้ว |
| ระบบเดิน + A* (8 ทิศ, ไม่ตัดมุม, เลี่ยงกับดักสำหรับ Rogue) | ✅ ทดสอบแล้ว |
| สร้าง/อัปเกรด/หมุน/ย้าย/รื้อห้อง + ตรวจเส้นทางและการเชื่อมต่อ | ✅ ทดสอบแล้ว |
| มอนสเตอร์ 110 ชนิด (Lv1 จ้างได้ 10 ชนิด) + Unique ID + ตั้งชื่อ | ✅ |
| Hero Spawn รายวัน, ปาร์ตี้ 1–6, Formation, Rank F–SSS, **60 Class** แต่ละคลาส 3 สกิล + AI + จุดอ่อน | ✅ ทดสอบแล้ว |
| Combat Real-time: สูตร ATK×Skill×100/(100+DEF), MATK/MDEF, ACC/EVA, Crit, MP, ธาตุ 12 ธาตุ, สถานะ 17 แบบ, Summon, Revive, Protect, Taunt | ✅ ทดสอบแล้ว |
| Hero Loot & Cuisine CopyPack: ไอเทมตามแคตตาล็อก + ไอคอนจากภาพจริง, Drop Tier normal/elite/boss (2/4/6 ครั้ง), Hero Remains, แท็บคลัง, ล็อก, ขาย Common ทั้งหมด, ยืนยันก่อนขาย Legendary/Mythic | ✅ ทดสอบแล้ว |
| สถานีแปรรูป 6 แบบ (เตาหลอม/โต๊ะแปรรูป/ครัว/ห้องปรุงยา/เครื่องสกัดวิญญาณ/โรงถ้วยรางวัล) ระดับ 1–3 + คิวงาน | ✅ ทดสอบแล้ว |
| Monster Cuisine 20 สูตร, บัฟอาหาร 1 อย่างต่อตัว (HP/ATK/DEF/MATK/ธาตุ/ต้านทาน/Lifesteal/EXP) | ✅ ทดสอบแล้ว |
| กับดัก 50 แบบตาม Trap DB + ภาพจริง: รูปแบบ hit/ยิง/แนวตรง/วงกว้าง/พื้นที่/กระโดด/ทั้งห้อง, ดาเมจ 9 ประเภท, Lv1–5, คอมโบ, ซินเนอร์จีกับมอนสเตอร์, กับดักติดผนัง, ซ่อม/อัปเกรด/ย้าย/ขาย 50% | ✅ ทดสอบแล้ว (ยิงครบ 50 แบบ) |
| Monster Recruitment / Training (ค่าสถานะเปลี่ยนจริง) / EXP / Level 1–50 | ✅ ทดสอบแล้ว |
| Cleaning Crew (จัดลำดับงาน, ขนของ, ห้องสกปรก, โรคระบาด) | ✅ ทดสอบแล้ว |
| Save/Load: รหัส 4 ตัว (คลาวด์), 3 ช่อง + Auto Save, Version, Validation, Checksum, ไม่เขียนทับเซฟเสีย | ✅ ทดสอบแล้ว |
| Dungeon Level 1–10 เล่นต่อได้เรื่อยๆ | ✅ ทดสอบถึง Lv4 |
| Boss 50 ตัว 5 Tier: Boss Room, อัญเชิญด้วย Gold/Boss Soul, 3 Phase, Enrage, Minion, Boss HP Bar | ✅ ทดสอบแล้ว |
| Fusion: สูตรแน่นอน 9 สูตร, สูตรธาตุ 8 สูตร, Rarity Table, แสดงอัตราก่อนเริ่ม, Mutation 11 แบบ, ล็อกมอนสเตอร์, ยืนยัน 2 ชั้นสำหรับ Legendary/Mythic | ✅ ทดสอบแล้ว |
| Monster Tier T1–T5, Training 10 ประเภท + Fatigue band ตามเอกสาร, Codex (มอนสเตอร์/บอส/ผู้กล้า) | ✅ |
| Sprite จาก sprite sheet: ผู้กล้า 60 คลาส × 4 ทิศ, มอนสเตอร์ 110, บอส 50 · ภาพห้อง 21 ห้อง (เปลี่ยนลวดลายได้) | ✅ |
| เซฟเวอร์ชัน 1–2 โหลดได้ — แปลงสายพันธุ์/ไอเทม/กับดักเก่าเป็นของใหม่อัตโนมัติ (saveVersion 3) | ✅ ทดสอบแล้ว |
| หน้าปกจากภาพ cover, ภาพห้องครบทุกห้อง (ความละเอียด 768px วาดคมทุกเฟรม), ผู้กล้าหันตามทิศเดิน | ✅ |

**ค่าที่ปรับจากเอกสาร** (ทั้งหมดอยู่ใน `src/config/balance.js`): Monster Tier ใช้ x1.0/1.15/1.35/1.6/2.0 แทน x1.0–3.0 เพราะชันเกินจนผู้กล้าตามไม่ทัน,
ธาตุที่ต้านทานใช้ x0.6 แทน x0.5, ค่าพลังบอสคูณ 0.45 (เอกสารระบุว่าเป็นค่าทดสอบ), ผู้กล้า Rank F คูณ 0.8 ช่วงต้นเกม

ระบบเพิ่มเติมที่ทำแล้ว: Evolution (เปลี่ยนสายพันธุ์/ค่าสถานะ/สกิล/รูปลักษณ์), Personality 7 แบบ, Fatigue/Hunger/Loyalty,
อาหาร + ฟาร์ม + ซื้ออัตโนมัติ, Merchant, ค่าบำรุงรายวัน + ประวัติรายรับรายจ่าย, Random Events 7 แบบ,
Reputation, Dungeon Core (HP/Level/Defense/Aura/Upgrade), ประเมินความยากเส้นทาง, Day/Night, Pause/x1/x2/x4, เสียง 8-bit

**ยังไม่ได้สร้าง:**
- กรอบ/ปุ่มจากภาพ UI Kit และ Button Sheet (ตอนนี้ใช้สไตล์ JRPG ที่เขียนด้วย CSS)
- กฎแปรรูปอัตโนมัติ (auto-processing rules) และ Mimic Lure จากเอกสาร System Details
- Monster Breeding / Nursery, Spawn Room / Biome, Mana
- Monster Relationship / Combo Skill (§11)
- Research Lab / Research Tree
- ผู้กล้าพิเศษที่มีชื่อเฉพาะ (GDD §13)
- Merchant Room, Monster Egg, Hero Equipment ที่ส่งผลต่อค่าสถานะผู้กล้า
- Animation ตามท่าโจมตี/สกิลของ sprite (ตอนนี้ใช้การเด้ง/พุ่ง/กระพริบ เพราะ sprite sheet มีภาพนิ่ง 1 เฟรมต่อทิศ)
- มอนสเตอร์ใช้ภาพทิศเดียว (sheet ไม่มีมุมอื่น) — กลับซ้าย/ขวาตามทิศที่หัน
- ขอบ sprite ที่ตัดจาก sheet อัตโนมัติอาจมีเศษพื้นหลังเล็กน้อยในบางตัว

**สมดุลที่ทดสอบ:** บอท 100 วันถึง Lv4, ทองไม่ล้นแล้ว (ค่าบำรุงเพิ่มตามเลเวลมอนสเตอร์และห้อง) · ผู้กล้าหลบหนีได้ราว 25% · ยังไม่ได้ทดสอบหลัง Lv5
