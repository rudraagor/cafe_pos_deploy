export const DEMO_CUSTOMER_EMAIL_DOMAIN = "@demo.cafe.test";
export const DEMO_EMPLOYEE_PASSWORD = "cashier1234";

export const DEMO_EMPLOYEES = [
  { name: "Priya Sharma", email: "priya@cafe.test" },
  { name: "Rahul Mehta", email: "rahul@cafe.test" },
  { name: "Ananya Iyer", email: "ananya@cafe.test" },
  { name: "Vikram Singh", email: "vikram@cafe.test" },
] as const;

export const DEMO_CUSTOMERS = [
  { name: "Aarav Patel", email: "aarav@demo.cafe.test", phone: "9876500101" },
  { name: "Diya Kapoor", email: "diya@demo.cafe.test", phone: "9876500102" },
  { name: "Kabir Shah", email: "kabir@demo.cafe.test", phone: "9876500103" },
  { name: "Meera Nair", email: "meera@demo.cafe.test", phone: "9876500104" },
  { name: "Rohan Das", email: "rohan@demo.cafe.test", phone: "9876500105" },
  { name: "Sana Khan", email: "sana@demo.cafe.test", phone: "9876500106" },
  { name: "Arjun Reddy", email: "arjun@demo.cafe.test", phone: "9876500107" },
  { name: "Isha Gupta", email: "isha@demo.cafe.test", phone: "9876500108" },
  { name: "Neel Joshi", email: null, phone: "9876500109" },
  { name: "Tara Bose", email: "tara@demo.cafe.test", phone: "9876500110" },
  { name: "Dev Malhotra", email: "dev@demo.cafe.test", phone: "9876500111" },
  { name: "Kavya Rao", email: "kavya@demo.cafe.test", phone: "9876500112" },
  { name: "Yash Verma", email: null, phone: "9876500113" },
  { name: "Nisha Pillai", email: "nisha@demo.cafe.test", phone: "9876500114" },
  { name: "Harsh Desai", email: "harsh@demo.cafe.test", phone: "9876500115" },
  { name: "Pooja Menon", email: "pooja@demo.cafe.test", phone: "9876500116" },
  { name: "Aditya Chawla", email: "aditya@demo.cafe.test", phone: "9876500117" },
  { name: "Ritu Agarwal", email: "ritu@demo.cafe.test", phone: "9876500118" },
  { name: "Manish Kulkarni", email: null, phone: "9876500119" },
  { name: "Sneha Bhat", email: "sneha@demo.cafe.test", phone: "9876500120" },
  { name: "Karan Thakur", email: "karan@demo.cafe.test", phone: "9876500121" },
  { name: "Lakshmi Venkat", email: "lakshmi@demo.cafe.test", phone: "9876500122" },
  { name: "Farhan Ali", email: "farhan@demo.cafe.test", phone: "9876500123" },
  { name: "Gita Sharma", email: "gita@demo.cafe.test", phone: "9876500124" },
  { name: "Omkar Pawar", email: null, phone: "9876500125" },
  { name: "Bhavna Sethi", email: "bhavna@demo.cafe.test", phone: "9876500126" },
  { name: "Nikhil Saxena", email: "nikhil@demo.cafe.test", phone: "9876500127" },
  { name: "Preeti Anand", email: "preeti@demo.cafe.test", phone: "9876500128" },
  { name: "Sameer Khanna", email: "sameer@demo.cafe.test", phone: "9876500129" },
  { name: "Uma Krishnan", email: "uma@demo.cafe.test", phone: "9876500130" },
  { name: "Varun Chopra", email: "varun@demo.cafe.test", phone: "9876500131" },
  { name: "Zoya Mirza", email: "zoya@demo.cafe.test", phone: "9876500132" },
  { name: "Ashwin Nambiar", email: null, phone: "9876500133" },
  { name: "Chitra Subramaniam", email: "chitra@demo.cafe.test", phone: "9876500134" },
  { name: "Deepak Rana", email: "deepak@demo.cafe.test", phone: "9876500135" },
  { name: "Esha Malhotra", email: "esha@demo.cafe.test", phone: "9876500136" },
  { name: "Faisal Qureshi", email: "faisal@demo.cafe.test", phone: "9876500137" },
  { name: "Geeta Rathi", email: "geeta@demo.cafe.test", phone: "9876500138" },
  { name: "Himanshu Dutta", email: null, phone: "9876500139" },
  { name: "Indira Prasad", email: "indira@demo.cafe.test", phone: "9876500140" },
] as const;

export const EXTRA_CATEGORIES = [
  { name: "Sandwiches", color: "#c05621" },
  { name: "Desserts", color: "#b83280" },
] as const;

export const EXTRA_PRODUCTS = [
  {
    name: "Americano",
    category: "Coffee",
    price: "160.00",
    taxRate: "5.00",
    isKitchenItem: true,
  },
  {
    name: "Latte",
    category: "Coffee",
    price: "200.00",
    taxRate: "5.00",
    isKitchenItem: true,
  },
  {
    name: "Cold Brew",
    category: "Coffee",
    price: "190.00",
    taxRate: "5.00",
    isKitchenItem: true,
  },
  {
    name: "Green Tea",
    category: "Tea",
    price: "100.00",
    taxRate: "5.00",
    isKitchenItem: true,
  },
  {
    name: "Iced Coffee",
    category: "Cold Drinks",
    price: "170.00",
    taxRate: "12.00",
    isKitchenItem: false,
  },
  {
    name: "Fresh Lime Soda",
    category: "Cold Drinks",
    price: "120.00",
    taxRate: "12.00",
    isKitchenItem: false,
  },
  {
    name: "Mango Smoothie",
    category: "Cold Drinks",
    price: "210.00",
    taxRate: "12.00",
    isKitchenItem: false,
  },
  {
    name: "Blueberry Muffin",
    category: "Pastries",
    price: "130.00",
    taxRate: "12.00",
    isKitchenItem: true,
  },
  {
    name: "Chocolate Brownie",
    category: "Pastries",
    price: "140.00",
    taxRate: "12.00",
    isKitchenItem: true,
  },
  {
    name: "Veg Grilled Sandwich",
    category: "Sandwiches",
    price: "220.00",
    taxRate: "5.00",
    isKitchenItem: true,
  },
  {
    name: "Chicken Club Sandwich",
    category: "Sandwiches",
    price: "280.00",
    taxRate: "5.00",
    isKitchenItem: true,
  },
  {
    name: "Cheesecake Slice",
    category: "Desserts",
    price: "240.00",
    taxRate: "12.00",
    isKitchenItem: true,
  },
  {
    name: "Tiramisu",
    category: "Desserts",
    price: "260.00",
    taxRate: "12.00",
    isKitchenItem: true,
  },
] as const;

export const EXTRA_FLOORS = [{ name: "First Floor" }] as const;

export const EXTRA_TABLES = [
  { floor: "First Floor", number: 5, seats: 2 },
  { floor: "First Floor", number: 6, seats: 4 },
  { floor: "First Floor", number: 7, seats: 4 },
  { floor: "First Floor", number: 8, seats: 6 },
  { floor: "Ground Floor", number: 5, seats: 2 },
  { floor: "Ground Floor", number: 6, seats: 4 },
] as const;
