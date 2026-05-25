import type {
  ListingBuildingType,
  ListingCustomFields,
  UserStatus,
  UtilityIncluded,
} from "@/db/schema";

const now = new Date();

function daysAgo(days: number) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function hoursAgo(hours: number) {
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

type SeedUser = {
  id: string;
  email: string;
  fullName: string;
  organization: string;
  role: "partner";
  status: UserStatus;
};

type SeedListing = {
  propertyId: string;
  listingId: string;
  ownerUserId: string;
  name: string;
  address: {
    street1: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    neighborhood: string;
    latitude: number;
    longitude: number;
  };
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  listing: {
    title: string;
    description: string;
    status: "published";
    bedrooms: number;
    bathrooms: number;
    squareFeet: number;
    monthlyRentCents: number;
    availableOn: string;
    buildingType: ListingBuildingType;
    leaseTermMonths: number;
    utilitiesIncluded: UtilityIncluded[];
    maxIncomeCents: number | null;
    applicationUrl: string | null;
    applicationEmail: string;
    applicationPhone: string;
    customFields: ListingCustomFields;
    publishedAt: Date;
  };
  images: Array<{
    id: string;
    imageUrl: string;
    altText: string;
    sortOrder: number;
  }>;
};

export const mockListingSeedUsers: SeedUser[] = [
  {
    id: "8a4a1c73-9d91-4a7e-9c95-111111111111",
    email: "seed-partner-waterloo@example.com",
    fullName: "Waterloo Demo Partner",
    organization: "Waterloo Housing Co-op",
    role: "partner",
    status: "active",
  },
  {
    id: "8a4a1c73-9d91-4a7e-9c95-222222222222",
    email: "seed-partner-regional@example.com",
    fullName: "Regional Demo Partner",
    organization: "Civic Homes",
    role: "partner",
    status: "active",
  },
];

const waterlooPartnerUserId = "8a4a1c73-9d91-4a7e-9c95-111111111111";
const regionalPartnerUserId = "8a4a1c73-9d91-4a7e-9c95-222222222222";

export const mockListingSeedListings: SeedListing[] = [
  {
    propertyId: "2c55db03-4f19-4b4c-b7a7-111111111111",
    listingId: "11111111-1111-4111-8111-111111111111",
    ownerUserId: waterlooPartnerUserId,
    name: "123 Main St Apartments",
    address: {
      street1: "123 Main St",
      city: "Waterloo",
      province: "ON",
      postalCode: "N2J 2H1",
      country: "Canada",
      neighborhood: "Uptown Waterloo",
      latitude: 43.45055954361165,
      longitude: -80.49228395260133,
    },
    contact: {
      name: "Alex Morgan",
      email: "leasing@waterloocoop.example.com",
      phone: "519-555-0100",
    },
    listing: {
      title: "123 Main St Apartments",
      description:
        "A bright family-sized apartment close to transit, schools, and downtown services. The building includes accessible common areas and a welcoming community room.",
      status: "published",
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1200,
      monthlyRentCents: 235000,
      availableOn: "2026-05-15",
      buildingType: "apartment",
      leaseTermMonths: 12,
      utilitiesIncluded: ["heat", "water"],
      maxIncomeCents: 7800000,
      applicationUrl: null,
      applicationEmail: "leasing@waterloocoop.example.com",
      applicationPhone: "519-555-0100",
      customFields: {
        braille_signage: true,
        lowered_kitchen_counters: true,
        main_entrance_is_barrier_free: true,
      },
      publishedAt: daysAgo(2),
    },
    images: [
      {
        id: "13f52e18-f79e-4e51-9352-111111111111",
        imageUrl:
          "https://images.pexels.com/photos/10117724/pexels-photo-10117724.jpeg?cs=srgb&dl=pexels-keeganjchecks-10117724.jpg&fm=jpg",
        altText: "Bright apartment living room and dining area",
        sortOrder: 0,
      },
      {
        id: "13f52e18-f79e-4e51-9352-111111111112",
        imageUrl:
          "https://images.pexels.com/photos/7746646/pexels-photo-7746646.jpeg?cs=srgb&dl=pexels-artbovich-7746646.jpg&fm=jpg",
        altText: "Open-concept living area and kitchen",
        sortOrder: 1,
      },
      {
        id: "13f52e18-f79e-4e51-9352-111111111113",
        imageUrl:
          "https://images.pexels.com/photos/7614411/pexels-photo-7614411.jpeg?cs=srgb&dl=pexels-artbovich-7614411.jpg&fm=jpg",
        altText: "Primary bedroom",
        sortOrder: 2,
      },
    ],
  },
  {
    propertyId: "2c55db03-4f19-4b4c-b7a7-222222222222",
    listingId: "22222222-2222-4222-8222-222222222222",
    ownerUserId: waterlooPartnerUserId,
    name: "456 King East Lofts",
    address: {
      street1: "456 King St E",
      city: "Kitchener",
      province: "ON",
      postalCode: "N2G 2L3",
      country: "Canada",
      neighborhood: "Downtown Kitchener",
      latitude: 43.451672,
      longitude: -80.473425,
    },
    contact: {
      name: "Alex Morgan",
      email: "leasing@waterloocoop.example.com",
      phone: "519-555-0100",
    },
    listing: {
      title: "456 King East Lofts",
      description:
        "Compact downtown loft housing with modern finishes and easy access to the ION line, grocery stores, and community supports.",
      status: "published",
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: 640,
      monthlyRentCents: 165000,
      availableOn: "2026-06-01",
      buildingType: "apartment",
      leaseTermMonths: 12,
      utilitiesIncluded: ["water"],
      maxIncomeCents: 6200000,
      applicationUrl: "https://example.com/apply/king-east-lofts",
      applicationEmail: "leasing@waterloocoop.example.com",
      applicationPhone: "519-555-0100",
      customFields: {},
      publishedAt: daysAgo(5),
    },
    images: [
      {
        id: "13f52e18-f79e-4e51-9352-222222222221",
        imageUrl:
          "https://images.pexels.com/photos/6758773/pexels-photo-6758773.jpeg?cs=srgb&dl=pexels-max-rahubovskiy-6758773.jpg&fm=jpg",
        altText: "Studio apartment with kitchen island",
        sortOrder: 0,
      },
      {
        id: "13f52e18-f79e-4e51-9352-222222222222",
        imageUrl:
          "https://images.pexels.com/photos/6585601/pexels-photo-6585601.jpeg?cs=srgb&dl=pexels-max-rahubovskiy-6585601.jpg&fm=jpg",
        altText: "Modern bedroom in downtown loft",
        sortOrder: 1,
      },
    ],
  },
  {
    propertyId: "2c55db03-4f19-4b4c-b7a7-333333333333",
    listingId: "33333333-3333-4333-8333-333333333333",
    ownerUserId: regionalPartnerUserId,
    name: "789 Erb Street Townhomes",
    address: {
      street1: "789 Erb St W",
      city: "Waterloo",
      province: "ON",
      postalCode: "N2T 2Z7",
      country: "Canada",
      neighborhood: "Beechwood",
      latitude: 43.449213,
      longitude: -80.569201,
    },
    contact: {
      name: "Jordan Lee",
      email: "housing@civichomes.example.com",
      phone: "519-555-0142",
    },
    listing: {
      title: "789 Erb Street Townhomes",
      description:
        "Quiet townhouse-style homes near parks and schools with a flexible paper application process for community referrals.",
      status: "published",
      bedrooms: 2,
      bathrooms: 1.5,
      squareFeet: 920,
      monthlyRentCents: 189500,
      availableOn: "2026-06-20",
      buildingType: "townhouse",
      leaseTermMonths: 6,
      utilitiesIncluded: ["water"],
      maxIncomeCents: null,
      applicationUrl: null,
      applicationEmail: "housing@civichomes.example.com",
      applicationPhone: "519-555-0142",
      customFields: {
        main_entrance_is_barrier_free: true,
      },
      publishedAt: daysAgo(8),
    },
    images: [
      {
        id: "13f52e18-f79e-4e51-9352-333333333331",
        imageUrl:
          "https://images.pexels.com/photos/5998138/pexels-photo-5998138.jpeg?cs=srgb&dl=pexels-max-rahubovskiy-5998138.jpg&fm=jpg",
        altText: "Townhome living room with large windows",
        sortOrder: 0,
      },
      {
        id: "13f52e18-f79e-4e51-9352-333333333332",
        imageUrl:
          "https://images.pexels.com/photos/7031413/pexels-photo-7031413.jpeg?cs=srgb&dl=pexels-max-rahubovskiy-7031413.jpg&fm=jpg",
        altText: "Family dining space in townhome",
        sortOrder: 1,
      },
    ],
  },
  {
    propertyId: "2c55db03-4f19-4b4c-b7a7-444444444444",
    listingId: "44444444-4444-4444-8444-444444444444",
    ownerUserId: regionalPartnerUserId,
    name: "12 Cedar Lane Suites",
    address: {
      street1: "12 Cedar Lane",
      city: "Cambridge",
      province: "ON",
      postalCode: "N1R 4B4",
      country: "Canada",
      neighborhood: "Galt",
      latitude: 43.361621,
      longitude: -80.314427,
    },
    contact: {
      name: "Jordan Lee",
      email: "housing@civichomes.example.com",
      phone: "519-555-0142",
    },
    listing: {
      title: "12 Cedar Lane Suites",
      description:
        "A small mixed-unit building with two currently available homes and frequent bus service to downtown Cambridge.",
      status: "published",
      bedrooms: 1,
      bathrooms: 1,
      squareFeet: 610,
      monthlyRentCents: 152500,
      availableOn: "2026-05-10",
      buildingType: "apartment",
      leaseTermMonths: 1,
      utilitiesIncluded: ["heat", "water"],
      maxIncomeCents: 5500000,
      applicationUrl: null,
      applicationEmail: "housing@civichomes.example.com",
      applicationPhone: "519-555-0142",
      customFields: {
        elevator_in_building: true,
      },
      publishedAt: hoursAgo(18),
    },
    images: [
      {
        id: "13f52e18-f79e-4e51-9352-444444444441",
        imageUrl:
          "https://images.pexels.com/photos/5997967/pexels-photo-5997967.jpeg?cs=srgb&dl=pexels-max-rahubovskiy-5997967.jpg&fm=jpg",
        altText: "Apartment kitchen and dining nook",
        sortOrder: 0,
      },
      {
        id: "13f52e18-f79e-4e51-9352-444444444442",
        imageUrl:
          "https://images.pexels.com/photos/6585619/pexels-photo-6585619.jpeg?cs=srgb&dl=pexels-max-rahubovskiy-6585619.jpg&fm=jpg",
        altText: "Apartment bedroom with window light",
        sortOrder: 1,
      },
    ],
  },
  {
    propertyId: "2c55db03-4f19-4b4c-b7a7-555555555555",
    listingId: "55555555-5555-4555-8555-555555555555",
    ownerUserId: waterlooPartnerUserId,
    name: "90 Queen South Residences",
    address: {
      street1: "90 Queen St S",
      city: "Kitchener",
      province: "ON",
      postalCode: "N2G 1V9",
      country: "Canada",
      neighborhood: "Victoria Park",
      latitude: 43.446971,
      longitude: -80.491214,
    },
    contact: {
      name: "Alex Morgan",
      email: "leasing@waterloocoop.example.com",
      phone: "519-555-0100",
    },
    listing: {
      title: "90 Queen South Residences",
      description:
        "A transit-connected mid-rise near Victoria Park with flexible layouts for singles and couples, plus easy access to community services and downtown shops.",
      status: "published",
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 830,
      monthlyRentCents: 171000,
      availableOn: "2026-05-28",
      buildingType: "condo",
      leaseTermMonths: 12,
      utilitiesIncluded: ["heat", "water", "hydro"],
      maxIncomeCents: 6400000,
      applicationUrl: null,
      applicationEmail: "leasing@waterloocoop.example.com",
      applicationPhone: "519-555-0100",
      customFields: {
        automated_building_doors: true,
        elevator_in_building: true,
      },
      publishedAt: hoursAgo(6),
    },
    images: [
      {
        id: "13f52e18-f79e-4e51-9352-555555555551",
        imageUrl:
          "https://images.pexels.com/photos/6585750/pexels-photo-6585750.jpeg?cs=srgb&dl=pexels-max-rahubovskiy-6585750.jpg&fm=jpg",
        altText: "Apartment living room in downtown mid-rise",
        sortOrder: 0,
      },
      {
        id: "13f52e18-f79e-4e51-9352-555555555552",
        imageUrl:
          "https://images.pexels.com/photos/6489127/pexels-photo-6489127.jpeg?cs=srgb&dl=pexels-max-rahubovskiy-6489127.jpg&fm=jpg",
        altText: "Bright bedroom in Queen South residence",
        sortOrder: 1,
      },
    ],
  },
];
