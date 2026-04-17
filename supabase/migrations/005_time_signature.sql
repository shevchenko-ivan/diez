-- Add time signature (розмір) to songs: "4/4", "3/4", "6/8", "2/4", "12/8"
alter table songs
  add column if not exists time_signature text default '4/4';
