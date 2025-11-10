import { IsDateString, IsInt, IsString, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMatchDto {
  @Type(() => Number)
  @IsInt()
  homeTeamId!: number;

  @Type(() => Number)
  @IsInt()
  awayTeamId!: number;

  @IsDateString()
  date!: string;

  @IsString()
  @MinLength(1)
  place!: string;
}
