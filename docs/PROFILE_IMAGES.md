# Profile pictures

Athletes and supporters can upload a profile picture from **Dashboard →
Edit profile**. Choose **Choose image** to select a JPEG, PNG, or WebP image
up to 5 MB. Review the preview, then choose **Upload picture**. Profile text
and athlete details are saved separately with **Save changes**.

Profile pictures are public:

- An athlete's picture is used as the athlete card image in Discover and on
  the athlete's public profile. Discover only lists athletes who have
  published payment details.
- The signed-in user's picture appears in the header avatar. Profile pictures
  are also used for athlete posts in the community feed when available.
- Supporters can set an account photo, which appears in their signed-in header.
  Supporters are not listed as athletes in Discover.

Each account has one profile picture. A separate multi-photo athlete gallery
is not part of this feature.

## Supabase setup

Apply `supabase/migrations/0013_profile_picture_storage.sql` after the earlier
migrations. It creates or configures the public `profile-images` Storage bucket
with a 5 MB file limit and JPEG, PNG, and WebP MIME types. Public reads are
allowed so profile images can render without a signed-in session. Upload,
update, and delete access is restricted to authenticated users writing under
their own user-ID folder. The app stores each user's image at
`<user-id>/profile` and saves its public URL in `profiles.profile_picture`.

The upload control replaces the user's profile photo. The application checks
file type and size, and the bucket enforces the same limits. A public image
URL can be viewed by anyone; do not upload private or sensitive images.

If upload reports **Bucket not found**, the migration has not been applied to
the Supabase project configured for this app. In the Supabase Dashboard, open
**SQL Editor**, paste and run the complete contents of
`supabase/migrations/0013_profile_picture_storage.sql`, then retry the upload.
