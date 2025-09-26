/*
  Warnings:

  - A unique constraint covering the columns `[instance_id,section_name]` on the table `product_form_data` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "product_form_data_instance_id_section_name_key" ON "product_form_data"("instance_id", "section_name");
