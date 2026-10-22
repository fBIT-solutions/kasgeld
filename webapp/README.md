# Kasgeld

A collaborative financial management application for shared expenses, unit assignments, and payment tracking.

## What is Kasgeld?

Kasgeld helps groups (families, teams, organizations) manage shared financial contributions and distributions. Key features include:

- **Unit Management**: Assign units (hands) to participants for specific months
- **Payment Tracking**: Track who has paid their monthly contribution
- **Payouts**: Calculate and distribute the monthly pot fairly
- **Swap Requests**: Allow participants to swap assigned units
- **Email Notifications**: Automated notifications for payments and unit assignments
- **Admin Dashboard**: Comprehensive management interface for administrators

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Environment variables (see [DEVELOPMENT.md](./DEVELOPMENT.md))

### Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm run start
```

## Documentation

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Setup, development workflow, and contribution guidelines
- **[Architecture](../docs/ARCHITECTURE.md)** - System design and data models
- **[API Reference](../docs/API.md)** - Endpoint documentation
- **[Deployment](../docs/DEPLOYMENT.md)** - Production deployment guide

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: Azure Cosmos DB
- **Email**: Resend
- **Auth**: NextAuth.js
- **Styling**: Tailwind CSS + Radix UI

## Core Concepts

### Communities and Access

- A registered user can belong to multiple communities and switch the active community from the community selector.
- Any authenticated user can create a community. Its creator is the first owner; owners administer the community and can add registered users by email, promote members to owners, or remove members.
- Community-owned records are stored with a `communityId`. API routes verify membership in the selected community before reading or changing those records.
- Existing single-community Cosmos DB records are left unchanged. Records without a `communityId` are not shown in new communities; they are not automatically migrated.

### Payments vs Payouts

**Payments**: Monthly contribution per participant
- Amount = (number of hands per participant) × (monthly rate)
- Each participant pays based on their assigned units

**Payouts (Pot)**: Total monthly distribution
- Amount = (total hands in run) × (monthly rate)
- Same amount paid to everyone with assigned units that month

### Units, Hands & Months

- **Hand**: Individual financial unit (smallest denomination)
- **Unit**: Assignment of a hand to a participant for a specific month
- **Month**: Time period (MM-YYYY format)
- **Run**: A complete cycle with all months, users, and units

## Key Files

- `app/api/*` - API endpoints and business logic
- `components/` - React components
- `lib/` - Utilities (auth, database, email)
- `app/beheer/` - Admin dashboard

## License

Proprietary - All rights reserved

## Support

For issues or questions, contact the development team.
