import { IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class SearchUsersDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : ''))
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  query!: string;
}
