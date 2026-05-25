import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AssetsService } from './assets.service';
import { AssetsImportService } from './assets-import.service';
import { PrismaService } from '../prisma/prisma.service';
import { SoftwareService } from '../software/software.service';

describe('AssetsService', () => {
  let service: AssetsService;
  const prisma = {
    asset: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    assetRelationship: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    softwareLicense: { findFirst: jest.fn() },
    assetSoftware: {
      aggregate: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    ticket: { findFirst: jest.fn() },
    ticketAsset: { upsert: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
    changeRequest: { findUnique: jest.fn() },
    changeAsset: { upsert: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
    problemRecord: { findUnique: jest.fn() },
    problemAsset: { upsert: jest.fn(), findUnique: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(AssetsService);
    jest.clearAllMocks();
  });

  it('rejects self-relationship', async () => {
    prisma.asset.findFirst.mockResolvedValue({ id: 'a1', deletedAt: null });
    await expect(
      service.addRelationship('a1', {
        targetAssetId: 'a1',
        relationType: 'depends_on',
        direction: 'downstream',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate relationships', async () => {
    prisma.asset.findFirst.mockResolvedValue({ id: 'a1', deletedAt: null });
    prisma.assetRelationship.findFirst.mockResolvedValue({ id: 'rel1' });
    await expect(
      service.addRelationship('a1', {
        targetAssetId: 'a2',
        relationType: 'depends_on',
        direction: 'downstream',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates downstream relationship', async () => {
    prisma.asset.findFirst.mockResolvedValue({ id: 'a1', deletedAt: null });
    prisma.assetRelationship.findFirst.mockResolvedValue(null);
    prisma.assetRelationship.create.mockResolvedValue({ id: 'rel1' });
    await service.addRelationship('a1', {
      targetAssetId: 'a2',
      relationType: 'depends_on',
      direction: 'downstream',
    });
    expect(prisma.assetRelationship.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { parentAssetId: 'a1', childAssetId: 'a2', relationType: 'depends_on' },
      }),
    );
  });
});

describe('AssetsImportService', () => {
  let service: AssetsImportService;
  const prisma = {
    user: { findFirst: jest.fn() },
    service: { findFirst: jest.fn() },
    asset: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsImportService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(AssetsImportService);
    jest.clearAllMocks();
  });

  it('dry run counts create without writing', async () => {
    prisma.asset.findFirst.mockResolvedValue(null);
    const csv = 'name,assetType\nLaptop,hardware\n';
    const result = await service.importCsv(csv, true);
    expect(result.created).toBe(1);
    expect(prisma.asset.create).not.toHaveBeenCalled();
  });

  it('imports and creates asset', async () => {
    prisma.asset.findFirst.mockResolvedValue(null);
    prisma.asset.create.mockResolvedValue({ id: 'new' });
    const csv = 'name,assetType\nLaptop,hardware\n';
    const result = await service.importCsv(csv, false);
    expect(result.created).toBe(1);
    expect(prisma.asset.create).toHaveBeenCalled();
  });
});

describe('SoftwareService', () => {
  let service: SoftwareService;
  const prisma = {
    softwareLicense: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    assetSoftware: { aggregate: jest.fn(), deleteMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoftwareService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(SoftwareService);
    jest.clearAllMocks();
  });

  it('computes seats used', async () => {
    prisma.assetSoftware.aggregate.mockResolvedValue({ _sum: { seatsUsed: 7 } });
    await expect(service.getSeatsUsed('lic1')).resolves.toBe(7);
  });

  it('blocks reducing seats below usage', async () => {
    prisma.softwareLicense.findFirst.mockResolvedValue({
      id: 'lic1',
      deletedAt: null,
      seatsTotal: 10,
      installations: [{ seatsUsed: 5 }],
    });
    prisma.assetSoftware.aggregate.mockResolvedValue({ _sum: { seatsUsed: 8 } });
    await expect(service.update('lic1', { seatsTotal: 5 })).rejects.toBeInstanceOf(BadRequestException);
  });
});
