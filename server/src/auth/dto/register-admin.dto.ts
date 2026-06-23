import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RegisterAdminDto {
  @IsString()
  @Matches(/^\d{11}$/, { message: 'El RUC debe tener 11 digitos.' })
  ruc!: string;

  @IsString()
  @IsNotEmpty()
  razonSocial!: string;

  @IsString()
  @IsNotEmpty()
  distrito!: string;
}
