import { createRng } from "./generators";

export const BULK_DEFAULTS = {
  productTarget: 300,
  employeeTarget: 35,
  customerTarget: 400,
  historyDays: 180,
  orderVolumeMultiplier: 1.65,
  couponCount: 12,
} as const;

const CATEGORY_DEFS = [
  {
    name: "Coffee",
    color: "#7c4a2d",
    taxRate: "5.00",
    kitchen: true,
    count: 45,
  },
  { name: "Tea", color: "#2f855a", taxRate: "5.00", kitchen: true, count: 30 },
  {
    name: "Cold Drinks",
    color: "#3182ce",
    taxRate: "12.00",
    kitchen: false,
    count: 35,
  },
  {
    name: "Pastries",
    color: "#d69e2e",
    taxRate: "12.00",
    kitchen: true,
    count: 30,
  },
  {
    name: "Sandwiches",
    color: "#c05621",
    taxRate: "5.00",
    kitchen: true,
    count: 28,
  },
  {
    name: "Desserts",
    color: "#b83280",
    taxRate: "12.00",
    kitchen: true,
    count: 25,
  },
  {
    name: "Breakfast",
    color: "#dd6b20",
    taxRate: "5.00",
    kitchen: true,
    count: 22,
  },
  {
    name: "Salads",
    color: "#38a169",
    taxRate: "5.00",
    kitchen: true,
    count: 18,
  },
  {
    name: "Bowls",
    color: "#805ad5",
    taxRate: "5.00",
    kitchen: true,
    count: 20,
  },
  {
    name: "Snacks",
    color: "#d53f8c",
    taxRate: "12.00",
    kitchen: true,
    count: 22,
  },
  {
    name: "Smoothies",
    color: "#319795",
    taxRate: "12.00",
    kitchen: false,
    count: 20,
  },
  {
    name: "Mocktails",
    color: "#e53e3e",
    taxRate: "12.00",
    kitchen: false,
    count: 15,
  },
] as const;

const ADJECTIVES = [
  "Classic",
  "Signature",
  "House",
  "Spiced",
  "Fresh",
  "Golden",
  "Royal",
  "Garden",
  "Smoky",
  "Velvet",
  "Crispy",
  "Zesty",
  "Honey",
  "Caramel",
  "Toasted",
  "Seasonal",
  "Chef's",
  "Premium",
  "Lite",
  "Double",
];

const BASES: Record<string, string[]> = {
  Coffee: [
    "Espresso",
    "Americano",
    "Latte",
    "Cappuccino",
    "Mocha",
    "Macchiato",
    "Flat White",
    "Cold Brew",
    "Affogato",
    "Cortado",
    "Ristretto",
    "Frappe",
  ],
  Tea: [
    "Masala Chai",
    "Green Tea",
    "Earl Grey",
    "Lemon Tea",
    "Ginger Tea",
    "Kashmiri Kahwa",
    "Iced Tea",
    "Peach Tea",
    "Mint Tea",
    "Chai Latte",
  ],
  "Cold Drinks": [
    "Lemonade",
    "Iced Coffee",
    "Cola Float",
    "Virgin Mojito",
    "Blue Lagoon",
    "Sparkling Water",
    "Cold Coffee",
    "Fruit Punch",
    "Soda",
    "Energy Cooler",
  ],
  Pastries: [
    "Croissant",
    "Muffin",
    "Danish",
    "Puff",
    "Tart",
    "Scone",
    "Bagel",
    "Cookie",
    "Brownie",
    "Roll",
  ],
  Sandwiches: [
    "Grilled Sandwich",
    "Club Sandwich",
    "Panini",
    "Sub",
    "Wrap",
    "Toastie",
    "Baguette",
    "Slider",
  ],
  Desserts: [
    "Cheesecake",
    "Tiramisu",
    "Brownie Sundae",
    "Panna Cotta",
    "Mousse",
    "Ice Cream Scoop",
    "Waffle",
    "Pudding",
  ],
  Breakfast: [
    "Omelette",
    "Poha",
    "Upma",
    "Paratha",
    "Pancakes",
    "French Toast",
    "Avocado Toast",
    "Granola Bowl",
  ],
  Salads: [
    "Caesar Salad",
    "Garden Salad",
    "Greek Salad",
    "Protein Bowl",
    "Quinoa Salad",
    "Coleslaw",
  ],
  Bowls: [
    "Burrito Bowl",
    "Rice Bowl",
    "Buddha Bowl",
    "Poke Bowl",
    "Curry Bowl",
    "Noodle Bowl",
  ],
  Snacks: [
    "Fries",
    "Nachos",
    "Samosa",
    "Spring Roll",
    "Garlic Bread",
    "Popcorn",
    "Bruschetta",
    "Pakora",
  ],
  Smoothies: [
    "Mango Smoothie",
    "Berry Blast",
    "Green Detox",
    "Peanut Power",
    "Tropical Mix",
    "Banana Shake",
  ],
  Mocktails: [
    "Virgin Mojito",
    "Shirley Temple",
    "Passion Cooler",
    "Citrus Spark",
    "Mint Fizz",
    "Sunset Punch",
  ],
};

const FIRST_NAMES = [
  "Aarav",
  "Priya",
  "Rahul",
  "Ananya",
  "Vikram",
  "Diya",
  "Kabir",
  "Meera",
  "Rohan",
  "Sana",
  "Arjun",
  "Isha",
  "Neel",
  "Tara",
  "Dev",
  "Kavya",
  "Yash",
  "Nisha",
  "Harsh",
  "Pooja",
  "Aditya",
  "Ritu",
  "Manish",
  "Sneha",
  "Karan",
  "Lakshmi",
  "Farhan",
  "Gita",
  "Omkar",
  "Bhavna",
  "Nikhil",
  "Preeti",
  "Sameer",
  "Uma",
  "Varun",
  "Zoya",
  "Ashwin",
  "Chitra",
  "Deepak",
  "Esha",
];

const LAST_NAMES = [
  "Sharma",
  "Mehta",
  "Iyer",
  "Singh",
  "Patel",
  "Kapoor",
  "Shah",
  "Nair",
  "Das",
  "Khan",
  "Reddy",
  "Gupta",
  "Joshi",
  "Bose",
  "Malhotra",
  "Rao",
  "Verma",
  "Pillai",
  "Desai",
  "Menon",
  "Chawla",
  "Agarwal",
  "Kulkarni",
  "Bhat",
  "Thakur",
  "Venkat",
  "Ali",
  "Pawar",
  "Sethi",
  "Saxena",
  "Anand",
  "Khanna",
  "Krishnan",
  "Chopra",
  "Mirza",
  "Nambiar",
  "Subramaniam",
  "Rana",
  "Qureshi",
  "Rathi",
];

export type GeneratedCategory = { name: string; color: string };
export type GeneratedProduct = {
  name: string;
  category: string;
  price: string;
  taxRate: string;
  isKitchenItem: boolean;
};
export type GeneratedEmployee = { name: string; email: string };
export type GeneratedCustomer = {
  name: string;
  email: string | null;
  phone: string;
};
export type GeneratedCoupon = {
  code: string;
  discountType: "percent" | "fixed";
  value: string;
  stackable: boolean;
};

export function generateBulkCategories(): GeneratedCategory[] {
  return CATEGORY_DEFS.map(({ name, color }) => ({ name, color }));
}

export function generateBulkProducts(
  target: number = BULK_DEFAULTS.productTarget,
): GeneratedProduct[] {
  const rng = createRng(424242);
  const products: GeneratedProduct[] = [];
  const usedNames = new Set<string>();

  for (const category of CATEGORY_DEFS) {
    const bases = BASES[category.name] ?? ["Special"];
    let made = 0;
    let attempt = 0;

    while (made < category.count && products.length < target && attempt < 500) {
      attempt += 1;
      const adj = ADJECTIVES[Math.floor(rng() * ADJECTIVES.length)]!;
      const base = bases[Math.floor(rng() * bases.length)]!;
      const suffix =
        rng() > 0.7
          ? ` ${["Regular", "Large", "Mini"][Math.floor(rng() * 3)]}`
          : "";
      const name = `${adj} ${base}${suffix}`.replace(/\s+/g, " ").trim();

      if (usedNames.has(name)) continue;
      usedNames.add(name);

      const basePrice =
        category.name === "Coffee" || category.name === "Tea"
          ? 90 + Math.floor(rng() * 180)
          : category.name === "Snacks"
            ? 80 + Math.floor(rng() * 120)
            : 120 + Math.floor(rng() * 280);

      products.push({
        name,
        category: category.name,
        price: basePrice.toFixed(2),
        taxRate: category.taxRate,
        isKitchenItem: category.kitchen,
      });
      made += 1;
    }
  }

  while (products.length < target) {
    const category = CATEGORY_DEFS[products.length % CATEGORY_DEFS.length]!;
    const name = `${ADJECTIVES[products.length % ADJECTIVES.length]} ${category.name} Special ${products.length + 1}`;
    if (usedNames.has(name)) continue;
    usedNames.add(name);
    products.push({
      name,
      category: category.name,
      price: (140 + (products.length % 90)).toFixed(2),
      taxRate: category.taxRate,
      isKitchenItem: category.kitchen,
    });
  }

  return products.slice(0, target);
}

export function generateBulkEmployees(
  target: number = BULK_DEFAULTS.employeeTarget,
): GeneratedEmployee[] {
  const employees: GeneratedEmployee[] = [];
  const usedEmails = new Set<string>();

  for (let i = 0; i < FIRST_NAMES.length && employees.length < target; i += 1) {
    for (
      let j = 0;
      j < LAST_NAMES.length && employees.length < target;
      j += 1
    ) {
      const name = `${FIRST_NAMES[i]} ${LAST_NAMES[j]}`;
      const slug = `${FIRST_NAMES[i]}.${LAST_NAMES[j]}`.toLowerCase();
      const email = `${slug}@cafe.test`;
      if (usedEmails.has(email)) continue;
      usedEmails.add(email);
      employees.push({ name, email });
    }
  }

  while (employees.length < target) {
    const n = employees.length + 1;
    employees.push({
      name: `Staff Member ${n}`,
      email: `staff${String(n).padStart(3, "0")}@cafe.test`,
    });
  }

  return employees.slice(0, target);
}

export function generateBulkCustomers(
  domain: string,
  target: number = BULK_DEFAULTS.customerTarget,
): GeneratedCustomer[] {
  const customers: GeneratedCustomer[] = [];

  for (let i = 0; i < target; i += 1) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length]!;
    const last = LAST_NAMES[(i * 7) % LAST_NAMES.length]!;
    const hasEmail = i % 5 !== 0;
    customers.push({
      name: `${first} ${last}`,
      email: hasEmail
        ? `customer${String(i + 1).padStart(4, "0")}${domain}`
        : null,
      phone: `98${String(76500000 + i).slice(-8)}`,
    });
  }

  return customers;
}

export function generateBulkCoupons(): GeneratedCoupon[] {
  return [
    {
      code: "WELCOME10",
      discountType: "percent",
      value: "10.00",
      stackable: true,
    },
    {
      code: "LOYAL20",
      discountType: "percent",
      value: "20.00",
      stackable: false,
    },
    { code: "FLAT50", discountType: "fixed", value: "50.00", stackable: true },
    {
      code: "WEEKEND15",
      discountType: "percent",
      value: "15.00",
      stackable: true,
    },
    {
      code: "MORNING5",
      discountType: "fixed",
      value: "25.00",
      stackable: true,
    },
    {
      code: "STUDENT10",
      discountType: "percent",
      value: "10.00",
      stackable: true,
    },
    {
      code: "BIRTHDAY25",
      discountType: "percent",
      value: "25.00",
      stackable: false,
    },
    {
      code: "CASHBACK30",
      discountType: "fixed",
      value: "30.00",
      stackable: false,
    },
    {
      code: "FESTIVE12",
      discountType: "percent",
      value: "12.00",
      stackable: true,
    },
    {
      code: "VIP100",
      discountType: "fixed",
      value: "100.00",
      stackable: false,
    },
    {
      code: "TEATIME8",
      discountType: "percent",
      value: "8.00",
      stackable: true,
    },
    {
      code: "NEWUSER15",
      discountType: "percent",
      value: "15.00",
      stackable: true,
    },
  ];
}

export function productPopularityWeights(
  productIds: string[],
): Map<string, number> {
  const weights = new Map<string, number>();
  productIds.forEach((id, index) => {
    const tier = index % 10;
    const weight = tier === 0 ? 8 : tier <= 2 ? 5 : tier <= 5 ? 3 : 1;
    weights.set(id, weight);
  });
  return weights;
}
