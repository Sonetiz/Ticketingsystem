export const userSummarySelect = {
  id: true,
  name: true,
  email: true,
  department: true,
  jobTitle: true,
} as const;

export const assetSummarySelect = {
  id: true,
  name: true,
  assetType: true,
  identifier: true,
  status: true,
  lifecycleStage: true,
  location: true,
  serialNumber: true,
} as const;
