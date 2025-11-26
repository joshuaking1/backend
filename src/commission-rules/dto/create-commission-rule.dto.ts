 import { IsArray, IsNotEmpty, IsObject, IsString } from 'class-validator';
        export class CreateCommissionRuleDto {
          @IsString()
          @IsNotEmpty()
          name: string;

          @IsArray()
          // We can't deeply validate JSON with class-validator easily,
          // so we'll rely on the service logic for that.
          tiers: any[];
        }