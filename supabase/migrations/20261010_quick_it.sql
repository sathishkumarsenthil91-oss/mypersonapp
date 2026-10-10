-- Quick IT: apply ONLY in a new, dedicated Supabase project.
-- RLS isolates every personal resource by auth.uid().
begin;
create schema if not exists qi_private;
revoke all on schema qi_private from public;
grant usage on schema qi_private to authenticated;

create table if not exists public.qi_profiles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '', avatar_url text, created_at timestamptz not null default now()
);
create table if not exists public.qi_folders(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 display_id text not null unique, parent_id uuid references public.qi_folders(id) on delete set null,
 name text not null check(length(name) between 1 and 180),favorite boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.qi_items(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 display_id text not null unique,folder_id uuid references public.qi_folders(id) on delete set null,
 title text not null check(length(title) between 1 and 300),
 description text, kind text not null check(kind in('photo','pdf','video','note','prompt','link','social','code','document','other')),
 tags text[] not null default '{}',url text,content text,storage_path text,
 favorite boolean not null default false,size_bytes bigint not null default 0 check(size_bytes>=0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.qi_tasks(
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(title) between 1 and 300),done boolean not null default false,
 due_at timestamptz,created_at timestamptz not null default now()
);
create table if not exists public.qi_ai_messages(
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in('user','assistant')),content text not null check(length(content)>0),
 created_at timestamptz not null default now()
);
create table if not exists public.qi_groups(
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 display_id text not null unique,name text not null check(length(name) between 1 and 180),
 description text,visibility text not null default 'private' check(visibility in('public','private')),
 created_at timestamptz not null default now()
);
create table if not exists public.qi_group_members(
 group_id uuid not null references public.qi_groups(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'viewer' check(role in('admin','editor','viewer')),
 joined_at timestamptz not null default now(),primary key(group_id,user_id)
);
create table if not exists public.qi_group_items(
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.qi_groups(id) on delete cascade,
 author_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(title) between 1 and 1000),
 content text,url text,created_at timestamptz not null default now()
);
create table if not exists public.qi_group_invites(
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.qi_groups(id) on delete cascade,
 invited_email text not null,token text not null unique,
 created_by uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default(now()+interval '7 days'),
 accepted_at timestamptz
);

create or replace function qi_private.group_role(p_group uuid)
returns text language sql stable security definer set search_path='' as $$
 select case when exists(select 1 from public.qi_groups g where g.id=p_group and g.owner_id=auth.uid()) then 'owner'
 else (select m.role from public.qi_group_members m where m.group_id=p_group and m.user_id=auth.uid()) end;
$$;
create or replace function qi_private.group_visible(p_group uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.qi_groups g where g.id=p_group
 and (g.visibility='public' or g.owner_id=auth.uid()
 or exists(select 1 from public.qi_group_members m where m.group_id=g.id and m.user_id=auth.uid())));
$$;
create or replace function qi_private.folder_owned(p_folder uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select p_folder is null or exists(select 1 from public.qi_folders f where f.id=p_folder and f.owner_id=auth.uid());
$$;
revoke all on function qi_private.group_role(uuid),qi_private.group_visible(uuid),qi_private.folder_owned(uuid) from public;
grant execute on function qi_private.group_role(uuid),qi_private.group_visible(uuid),qi_private.folder_owned(uuid) to authenticated;

alter table public.qi_profiles enable row level security;
alter table public.qi_folders enable row level security;
alter table public.qi_items enable row level security;
alter table public.qi_tasks enable row level security;
alter table public.qi_ai_messages enable row level security;
alter table public.qi_groups enable row level security;
alter table public.qi_group_members enable row level security;
alter table public.qi_group_items enable row level security;
alter table public.qi_group_invites enable row level security;

-- Explicit ownership checks on both read and write.
create policy qi_profile_read on public.qi_profiles for select to authenticated using(user_id=(select auth.uid()));
create policy qi_profile_write on public.qi_profiles for insert to authenticated with check(user_id=(select auth.uid()));
create policy qi_profile_edit on public.qi_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy qi_folder_read on public.qi_folders for select to authenticated using(owner_id=(select auth.uid()));
create policy qi_folder_insert on public.qi_folders for insert to authenticated with check(owner_id=(select auth.uid()) and qi_private.folder_owned(parent_id));
create policy qi_folder_update on public.qi_folders for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()) and qi_private.folder_owned(parent_id));
create policy qi_folder_delete on public.qi_folders for delete to authenticated using(owner_id=(select auth.uid()));

create policy qi_item_read on public.qi_items for select to authenticated using(owner_id=(select auth.uid()));
create policy qi_item_insert on public.qi_items for insert to authenticated with check(owner_id=(select auth.uid()) and qi_private.folder_owned(folder_id) and (storage_path is null or split_part(storage_path,'/',1)=owner_id::text));
create policy qi_item_update on public.qi_items for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()) and qi_private.folder_owned(folder_id) and (storage_path is null or split_part(storage_path,'/',1)=owner_id::text));
create policy qi_item_delete on public.qi_items for delete to authenticated using(owner_id=(select auth.uid()));

create policy qi_task_read on public.qi_tasks for select to authenticated using(owner_id=(select auth.uid()));
create policy qi_task_insert on public.qi_tasks for insert to authenticated with check(owner_id=(select auth.uid()));
create policy qi_task_update on public.qi_tasks for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy qi_task_delete on public.qi_tasks for delete to authenticated using(owner_id=(select auth.uid()));
create policy qi_chat_read on public.qi_ai_messages for select to authenticated using(owner_id=(select auth.uid()));
create policy qi_chat_insert on public.qi_ai_messages for insert to authenticated with check(owner_id=(select auth.uid()));
create policy qi_chat_delete on public.qi_ai_messages for delete to authenticated using(owner_id=(select auth.uid()));

create policy qi_group_read on public.qi_groups for select to authenticated using(qi_private.group_visible(id));
create policy qi_group_insert on public.qi_groups for insert to authenticated with check(owner_id=(select auth.uid()));
create policy qi_group_update on public.qi_groups for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy qi_group_delete on public.qi_groups for delete to authenticated using(owner_id=(select auth.uid()));
create policy qi_members_read on public.qi_group_members for select to authenticated using(user_id=(select auth.uid()) or qi_private.group_role(group_id) in('owner','admin'));
create policy qi_members_insert on public.qi_group_members for insert to authenticated with check(
 (user_id=(select auth.uid()) and role='viewer' and exists(select 1 from public.qi_groups where id=group_id and visibility='public'))
 or qi_private.group_role(group_id) in('owner','admin'));
create policy qi_members_update on public.qi_group_members for update to authenticated using(qi_private.group_role(group_id)='owner') with check(qi_private.group_role(group_id)='owner');
create policy qi_members_delete on public.qi_group_members for delete to authenticated using(user_id=(select auth.uid()) or qi_private.group_role(group_id) in('owner','admin'));
create policy qi_post_read on public.qi_group_items for select to authenticated using(qi_private.group_visible(group_id));
create policy qi_post_insert on public.qi_group_items for insert to authenticated with check(author_id=(select auth.uid()) and qi_private.group_role(group_id) in('owner','admin','editor'));
create policy qi_post_update on public.qi_group_items for update to authenticated using(author_id=(select auth.uid()) or qi_private.group_role(group_id) in('owner','admin')) with check(qi_private.group_role(group_id) in('owner','admin','editor'));
create policy qi_post_delete on public.qi_group_items for delete to authenticated using(author_id=(select auth.uid()) or qi_private.group_role(group_id) in('owner','admin'));

-- Invites only through checked SECURITY DEFINER RPCs.
revoke all on public.qi_group_invites from anon,authenticated;
create or replace function public.qi_create_invite(p_group_id uuid,p_email text)
returns text language plpgsql security definer set search_path='' as $$
declare v_token text;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if coalesce(qi_private.group_role(p_group_id),'none') not in('owner','admin') then raise exception 'Not authorized';end if;
 if length(trim(p_email))<5 or position('@' in p_email)=0 then raise exception 'Invalid email';end if;
 v_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into public.qi_group_invites(group_id,invited_email,token,created_by)
 values(p_group_id,lower(trim(p_email)),v_token,auth.uid());
 return v_token;
end;$$;
create or replace function public.qi_accept_invite(p_token text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_invite public.qi_group_invites%rowtype;v_email text;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select email into v_email from auth.users where id=auth.uid();
 select * into v_invite from public.qi_group_invites where token=p_token and accepted_at is null and expires_at>now() for update;
 if not found then raise exception 'Invalid or expired invitation';end if;
 if lower(v_email)<>lower(v_invite.invited_email) then raise exception 'This invitation is intended for another email';end if;
 insert into public.qi_group_members(group_id,user_id,role) values(v_invite.group_id,auth.uid(),'viewer') on conflict(group_id,user_id) do nothing;
 update public.qi_group_invites set accepted_at=now() where id=v_invite.id;
 return v_invite.group_id;
end;$$;
revoke all on function public.qi_create_invite(uuid,text),public.qi_accept_invite(text) from public;
grant execute on function public.qi_create_invite(uuid,text),public.qi_accept_invite(text) to authenticated;

grant select,insert,update,delete on public.qi_profiles,public.qi_folders,public.qi_items,public.qi_tasks,
 public.qi_ai_messages,public.qi_groups,public.qi_group_members,public.qi_group_items to authenticated;
create index if not exists idx_qi_folder_parent on public.qi_folders(owner_id,parent_id);
create index if not exists idx_qi_item_folder on public.qi_items(owner_id,folder_id,created_at desc);
create index if not exists idx_qi_item_tags on public.qi_items using gin(tags);
create index if not exists idx_qi_task_due on public.qi_tasks(owner_id,due_at);
create index if not exists idx_qi_chat_created on public.qi_ai_messages(owner_id,created_at);
create index if not exists idx_qi_member_user on public.qi_group_members(user_id);
create index if not exists idx_qi_group_created on public.qi_group_items(group_id,created_at desc);

insert into storage.buckets(id,name,public,file_size_limit) values('quick-it-files','quick-it-files',false,52428800)
on conflict(id) do nothing;
create policy qi_storage_select on storage.objects for select to authenticated
using(bucket_id='quick-it-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy qi_storage_insert on storage.objects for insert to authenticated
with check(bucket_id='quick-it-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy qi_storage_update on storage.objects for update to authenticated
using(bucket_id='quick-it-files' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check(bucket_id='quick-it-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy qi_storage_delete on storage.objects for delete to authenticated
using(bucket_id='quick-it-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
