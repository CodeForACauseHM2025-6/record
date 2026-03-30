-- CreateTable
CREATE TABLE "_ArticleToArticleGroup" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ArticleToArticleGroup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ArticleToArticleGroup_B_index" ON "_ArticleToArticleGroup"("B");

-- AddForeignKey
ALTER TABLE "_ArticleToArticleGroup" ADD CONSTRAINT "_ArticleToArticleGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ArticleToArticleGroup" ADD CONSTRAINT "_ArticleToArticleGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "ArticleGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
