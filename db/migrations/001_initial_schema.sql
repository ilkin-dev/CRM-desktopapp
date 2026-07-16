-- Initial local schema replacing Firestore's clients/interactions/tasks
-- collections, plus the new relational insurance data model.

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  fullName TEXT NOT NULL,
  status TEXT,
  phone TEXT,
  email TEXT,
  lineOfBusiness TEXT,
  carrier TEXT,
  renewalDate TEXT,
  referralSource TEXT,
  notes TEXT,
  dateOfBirth TEXT,
  maritalStatus TEXT,
  occupation TEXT,
  employer TEXT,
  secondaryPhone TEXT,
  mailingAddress TEXT,
  mailingCity TEXT,
  mailingProvince TEXT,
  mailingPostalCode TEXT,
  propertyAddressSameAsMailing INTEGER DEFAULT 1,
  propertyAddress TEXT,
  propertyCity TEXT,
  propertyProvince TEXT,
  propertyPostalCode TEXT,
  preferredContactMethod TEXT,
  preferredContactTime TEXT,
  language TEXT,
  driversLicenseNumber TEXT,
  licenseProvince TEXT,
  licenseExpiry TEXT,
  yearsLicensed INTEGER,
  licenseClass TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_renewalDate ON clients(renewalDate);
CREATE INDEX idx_clients_fullName ON clients(fullName);

CREATE TABLE household_members (
  id TEXT PRIMARY KEY,
  clientId TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fullName TEXT NOT NULL,
  dateOfBirth TEXT,
  relationship TEXT,
  createdAt TEXT NOT NULL
);
CREATE INDEX idx_household_members_clientId ON household_members(clientId);

CREATE TABLE policies (
  id TEXT PRIMARY KEY,
  clientId TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  carrier TEXT,
  policyNumber TEXT,
  status TEXT,
  effectiveDate TEXT,
  renewalDate TEXT,
  premium REAL,
  paymentFrequency TEXT,
  priorCarrier TEXT,
  claimsFreeYears INTEGER,
  liabilityLimit TEXT,
  deductibles TEXT,
  endorsements TEXT,
  additionalInsureds TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX idx_policies_clientId ON policies(clientId);
CREATE INDEX idx_policies_renewalDate ON policies(renewalDate);

CREATE TABLE vehicles (
  id TEXT PRIMARY KEY,
  policyId TEXT NOT NULL REFERENCES policies(id) ON DELETE CASCADE,
  year INTEGER,
  make TEXT,
  model TEXT,
  trim TEXT,
  vin TEXT,
  bodyType TEXT,
  usage TEXT,
  annualKm INTEGER,
  commuteKm INTEGER,
  purchaseDate TEXT,
  ownership TEXT,
  lienholder TEXT,
  antiTheftDevice INTEGER DEFAULT 0,
  winterTires INTEGER DEFAULT 0,
  garagingAddress TEXT,
  createdAt TEXT NOT NULL
);
CREATE INDEX idx_vehicles_policyId ON vehicles(policyId);

CREATE TABLE drivers (
  id TEXT PRIMARY KEY,
  clientId TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  fullName TEXT NOT NULL,
  dateOfBirth TEXT,
  relationship TEXT,
  licenseNumber TEXT,
  licenseProvince TEXT,
  licenseExpiry TEXT,
  licenseClass TEXT,
  yearsLicensed INTEGER,
  createdAt TEXT NOT NULL
);
CREATE INDEX idx_drivers_clientId ON drivers(clientId);

CREATE TABLE vehicle_drivers (
  vehicleId TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  driverId TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  PRIMARY KEY (vehicleId, driverId)
);

CREATE TABLE driving_record_entries (
  id TEXT PRIMARY KEY,
  driverId TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date TEXT,
  description TEXT,
  amount REAL,
  atFault INTEGER,
  createdAt TEXT NOT NULL
);
CREATE INDEX idx_driving_record_entries_driverId ON driving_record_entries(driverId);

CREATE TABLE property_details (
  id TEXT PRIMARY KEY,
  policyId TEXT NOT NULL UNIQUE REFERENCES policies(id) ON DELETE CASCADE,
  propertyType TEXT,
  yearBuilt INTEGER,
  squareFootage INTEGER,
  stories INTEGER,
  constructionType TEXT,
  roofType TEXT,
  roofAge INTEGER,
  heatingType TEXT,
  electricalType TEXT,
  electricalAmps INTEGER,
  electricalUpdatedYear INTEGER,
  plumbingType TEXT,
  plumbingUpdatedYear INTEGER,
  foundationType TEXT,
  basementType TEXT,
  bedrooms INTEGER,
  bathrooms INTEGER,
  waterSource TEXT,
  sewerType TEXT,
  distanceToFireHydrantKm REAL,
  distanceToFireHallKm REAL,
  hasPool INTEGER DEFAULT 0,
  hasTrampoline INTEGER DEFAULT 0,
  hasPets INTEGER DEFAULT 0,
  petDetails TEXT,
  securitySystem INTEGER DEFAULT 0,
  sumpPump INTEGER DEFAULT 0,
  backwaterValve INTEGER DEFAULT 0,
  priorWaterDamageClaims TEXT,
  mortgageLienholder TEXT,
  replacementCostEstimate REAL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE interactions (
  id TEXT PRIMARY KEY,
  clientId TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  policyId TEXT REFERENCES policies(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  date TEXT,
  summary TEXT,
  quoteAmount REAL,
  quoteLOB TEXT,
  followUpDate TEXT,
  followUpDone INTEGER DEFAULT 0,
  premiumAmount REAL,
  commissionRate REAL,
  commissionAmount REAL,
  createdAt TEXT NOT NULL
);
CREATE INDEX idx_interactions_clientId ON interactions(clientId);
CREATE INDEX idx_interactions_followUpDate ON interactions(followUpDate);
CREATE INDEX idx_interactions_type ON interactions(type);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  dueDate TEXT,
  done INTEGER DEFAULT 0,
  notes TEXT,
  clientId TEXT REFERENCES clients(id) ON DELETE SET NULL,
  createdAt TEXT NOT NULL
);
CREATE INDEX idx_tasks_clientId ON tasks(clientId);
CREATE INDEX idx_tasks_dueDate ON tasks(dueDate);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  clientId TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  policyId TEXT REFERENCES policies(id) ON DELETE SET NULL,
  category TEXT,
  name TEXT,
  filePath TEXT NOT NULL,
  contentType TEXT,
  uploadedAt TEXT NOT NULL
);
CREATE INDEX idx_documents_clientId ON documents(clientId);
