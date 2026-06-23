import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class RegisterEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^[A-Za-z0-9]{6}$/, {
    message: 'El codigo de invitacion debe tener 6 caracteres alfanumericos.',
  })
  codigoInvitacion!: string;
}
