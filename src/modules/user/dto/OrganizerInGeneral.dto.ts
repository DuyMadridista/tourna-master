export class OrganizerInGeneralDto {
    id: number;
    fullName: string;
    email: string;
    constructor(id: number, fullName: string, email: string) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
    }
}