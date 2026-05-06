create table users (
  id bigserial primary key,
  telegram_user_id text unique not null,
  wallet_address text unique,
  nickname text not null,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table farm_slots (
  id bigserial primary key,
  user_id bigint not null references users(id),
  land_nft_id text not null,
  slot_id integer not null,
  crop_type text,
  seed_pack_nft_id text,
  planted_at timestamptz,
  ready_at timestamptz,
  base_yield integer not null default 0,
  stolen_quantity integer not null default 0,
  status text not null default 'empty',
  unique (user_id, land_nft_id, slot_id)
);

create table pets (
  pet_nft_id text primary key,
  owner_wallet text not null,
  level integer not null default 1,
  energy integer not null default 5,
  energy_max integer not null default 5,
  last_energy_refresh timestamptz not null default now(),
  guard_power integer not null default 0,
  steal_power integer not null default 0
);

create table steal_logs (
  id bigserial primary key,
  thief_user_id bigint not null references users(id),
  target_user_id bigint not null references users(id),
  land_nft_id text not null,
  slot_id integer not null,
  crop_type text not null,
  stolen_quantity integer not null default 0,
  result text not null,
  created_at timestamptz not null default now()
);

create table harvest_claims (
  claim_id text primary key,
  user_id bigint not null references users(id),
  land_nft_id text not null,
  slot_id integer not null,
  crop_type text not null,
  quantity integer not null,
  server_signature text not null,
  used boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table listings (
  listing_id text primary key,
  nft_address text not null,
  seller_wallet text not null,
  price_ton numeric(18, 9) not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);
