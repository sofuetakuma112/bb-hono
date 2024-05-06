import "server-only";

type S3ImageType = "user" | "post";

// S3に画像をアップロードする
async function uploadImageToS3(file: File, type: S3ImageType): Promise<string> {
  // const bucketName =
  //   type === "user"
  //     ? env.SUPABASE_STORAGE_USER_AVATAR_BUCKET_NAME
  //     : env.SUPABASE_STORAGE_USER_POST_BUCKET_NAME;

  // const key = createId();

  // try {
  //   const { error } = await supabase.storage
  //     .from(bucketName)
  //     .upload(key, file, {
  //       contentType: file.type,
  //     });

  //   if (error) {
  //     console.error("Error uploading image to Supabase:", error);
  //     throw error;
  //   }

  //   return `${bucketName}/${key}`;
  // } catch (error) {
  //   console.error("Error uploading image to Supabase:", error);
  //   throw error;
  // }

  return file.name;
}

async function getImageUrlFromS3(s3Key: string | null) {
  if (!s3Key) return "";

  // const [bucketName, ...keyParts] = s3Key.split("/");
  // const key = keyParts.join("/");

  // if (!bucketName) return "";

  // const result = await supabase.storage
  //   .from(bucketName)
  //   .createSignedUrl(key, 60 * 60 * 24 * 7);
  // return result.data?.signedUrl ?? "";

  return s3Key;
}

export { uploadImageToS3, getImageUrlFromS3 };
