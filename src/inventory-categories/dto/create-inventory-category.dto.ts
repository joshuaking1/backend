import { IsNotEmpty, IsString } from 'class-validator';
export class CreateInventoryCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}