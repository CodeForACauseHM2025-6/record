import { mapDirectoryUser, isDirectoryConfigured } from "@/lib/google-directory";

describe("mapDirectoryUser", () => {
  it("maps a full directory user", () => {
    expect(
      mapDirectoryUser({
        primaryEmail: "jdoe@horacemann.org",
        name: { fullName: "Jane Doe" },
        thumbnailPhotoUrl: "https://photo",
      }),
    ).toEqual({ email: "jdoe@horacemann.org", name: "Jane Doe", photoUrl: "https://photo" });
  });

  it("falls back to email when name/photo missing", () => {
    expect(mapDirectoryUser({ primaryEmail: "x@horacemann.org" })).toEqual({
      email: "x@horacemann.org",
      name: "x@horacemann.org",
      photoUrl: null,
    });
  });

  it("returns null with no email", () => {
    expect(mapDirectoryUser({ name: { fullName: "No Email" } })).toBeNull();
  });
});

describe("isDirectoryConfigured", () => {
  const OLD = process.env;
  afterEach(() => {
    process.env = OLD;
  });

  it("false when env missing", () => {
    process.env = { ...OLD, GOOGLE_DIRECTORY_SA_KEY: "", GOOGLE_DIRECTORY_SUBJECT: "" };
    expect(isDirectoryConfigured()).toBe(false);
  });

  it("false when SA key is not valid JSON", () => {
    process.env = {
      ...OLD,
      GOOGLE_DIRECTORY_SA_KEY: "not-json",
      GOOGLE_DIRECTORY_SUBJECT: "admin@horacemann.org",
    };
    expect(isDirectoryConfigured()).toBe(false);
  });

  it("true with valid SA key + subject", () => {
    process.env = {
      ...OLD,
      GOOGLE_DIRECTORY_SA_KEY: JSON.stringify({ client_email: "sa@x.iam", private_key: "k" }),
      GOOGLE_DIRECTORY_SUBJECT: "admin@horacemann.org",
    };
    expect(isDirectoryConfigured()).toBe(true);
  });
});
