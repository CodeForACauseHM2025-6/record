// After Phase 5 the legacy plaintext columns are dropped from the DB. The Prisma extension in
// `lib/prisma.ts` still synthesizes them as runtime fields on read and accepts them as input on
// write — these augmentations make TypeScript see them too, so existing call sites don't need to
// be touched.
//
// The "real" columns underneath are *Ciphertext (Bytes) and the per-row encryptedDek/dekKekVersion;
// the extension swaps them in/out at the boundary.

import "@prisma/client";

declare module "@prisma/client" {
  interface User {
    email: string;
    name: string;
    image: string | null;
  }
  interface Article {
    body: string;
    featuredImage: string | null;
  }
  interface ArticleCredit {
    creditRole: string;
  }
  interface ArticleImage {
    url: string;
    caption: string | null;
    altText: string;
  }
  interface RoundTable {
    prompt: string;
  }
  interface RoundTableSide {
    label: string;
  }
  interface RoundTableTurn {
    body: string;
  }

  namespace Prisma {
    interface UserCreateInput {
      email: string;
      name: string;
      image?: string | null;
    }
    interface UserUpdateInput {
      email?: string;
      name?: string;
      image?: string | null;
    }
    interface UserWhereInput {
      email?: string | StringFilter<"User">;
    }
    interface UserWhereUniqueInput {
      email?: string;
    }

    interface ArticleCreateInput {
      body: string;
      featuredImage?: string | null;
    }
    interface ArticleUpdateInput {
      body?: string;
      featuredImage?: string | null;
    }

    interface ArticleCreditCreateInput {
      creditRole: string;
    }
    interface ArticleCreditCreateManyInput {
      creditRole: string;
    }

    interface ArticleImageCreateInput {
      url: string;
      caption?: string | null;
      altText: string;
    }
    interface ArticleImageCreateManyInput {
      url: string;
      caption?: string | null;
      altText: string;
    }

    interface RoundTableCreateInput {
      prompt: string;
    }
    interface RoundTableUpdateInput {
      prompt?: string;
    }

    interface RoundTableSideCreateInput {
      label: string;
    }
    interface RoundTableSideCreateManyInput {
      label: string;
    }

    interface RoundTableTurnCreateInput {
      body: string;
    }
    interface RoundTableTurnCreateManyInput {
      body: string;
    }
  }
}
