export const TEAM_DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export const TEAM_ENGAGEMENT_OPTIONS = ["Project", "Training"];

export const MOCK_PROJECTS = [
  "Atlas Commerce",
  "Nimbus Academy",
  "Spark CRM Revamp",
  "Pulse Analytics",
  "Orion Support",
  "Internal Enablement",
];

export const MOCK_EMPLOYEES = [
  {
    id: "EMP-1001",
    userId: "USR-1001",
    name: "Aarav Sharma",
    designation: "Senior Software Engineer",
    department: "Product Engineering",
    email: "aarav.sharma@ems.local",
    isManager: false,
  },
  {
    id: "EMP-1002",
    userId: "USR-1002",
    name: "Priya Iyer",
    designation: "Product Designer",
    department: "Design",
    email: "priya.iyer@ems.local",
    isManager: false,
  },
  {
    id: "EMP-1003",
    userId: "USR-1003",
    name: "Vikram Mehta",
    designation: "QA Lead",
    department: "Quality Engineering",
    email: "vikram.mehta@ems.local",
    isManager: false,
  },
  {
    id: "EMP-1004",
    userId: "USR-1004",
    name: "Rohan Das",
    designation: "Backend Engineer",
    department: "Platform",
    email: "rohan.das@ems.local",
    isManager: false,
  },
  {
    id: "EMP-1005",
    userId: "USR-1005",
    name: "Meera Nair",
    designation: "Learning Specialist",
    department: "People Operations",
    email: "meera.nair@ems.local",
    isManager: false,
  },
  {
    id: "EMP-1006",
    userId: "USR-1006",
    name: "Arjun Bhat",
    designation: "DevOps Engineer",
    department: "Infrastructure",
    email: "arjun.bhat@ems.local",
    isManager: false,
  },
  {
    id: "EMP-1007",
    userId: "USR-1007",
    name: "Sana Khan",
    designation: "Data Analyst",
    department: "Analytics",
    email: "sana.khan@ems.local",
    isManager: false,
  },
  {
    id: "EMP-1008",
    userId: "USR-1008",
    name: "Kabir Joshi",
    designation: "Full Stack Engineer",
    department: "Digital Products",
    email: "kabir.joshi@ems.local",
    isManager: false,
  },
  {
    id: "EMP-1009",
    userId: "USR-1009",
    name: "Tanya Gupta",
    designation: "Associate Engineer",
    department: "Product Engineering",
    email: "tanya.gupta@ems.local",
    isManager: false,
  },
  {
    id: "EMP-1101",
    userId: "USR-1101",
    name: "Nidhi Verma",
    designation: "Engineering Manager",
    department: "Product Engineering",
    email: "nidhi.verma@ems.local",
    isManager: true,
  },
  {
    id: "EMP-1102",
    userId: "USR-1102",
    name: "Rahul Kapoor",
    designation: "Learning Manager",
    department: "People Operations",
    email: "rahul.kapoor@ems.local",
    isManager: true,
  },
  {
    id: "EMP-1103",
    userId: "USR-1103",
    name: "Kavya Menon",
    designation: "Delivery Lead",
    department: "Client Success",
    email: "kavya.menon@ems.local",
    isManager: true,
  },
];

export const MOCK_MANAGERS = MOCK_EMPLOYEES.filter((employee) => employee.isManager);

export const getEmployeeById = (employeeId) =>
  MOCK_EMPLOYEES.find(
    (employee) =>
      String(employee.id).toLowerCase() === String(employeeId || "").trim().toLowerCase() ||
      String(employee.userId).toLowerCase() === String(employeeId || "").trim().toLowerCase()
  ) || null;

