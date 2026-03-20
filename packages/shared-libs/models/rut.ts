export class Rut {
    rutl: number;
    dv: string;

    constructor(r?: string) {
        this.rutl = 0;
        this.dv = '';
        if (r) this.init(r);
    }

    private init(r: string): void {
        if (!r) throw new Error(`Rut '${r}' no es válido.`);
        r = r.toUpperCase().replace(/[^0-9kK]+/g, '');
        this.rutl = parseInt(r.substring(0, r.length - 1), 10);
        this.dv = r[r.length - 1];
    }

    get rutStr(): string {
        return this.format('#.###-#');
    }

    set rutStr(value: string) {
        this.init(value);
    }

    get isCompany(): boolean {
        return this.rutl > 60000000;
    }

    format(fmt: string): string {
        if (fmt.includes('.') && fmt.includes('-')) {
            return `${this.rutl.toLocaleString('es-CL')}-${this.dv}`.toUpperCase();
        }
        if (fmt.includes('-')) {
            return `${this.rutl}-${this.dv}`.toUpperCase();
        }
        return `${this.rutl}${this.dv}`.toUpperCase();
    }

    toString(): string {
        return this.format('###-#');
    }

    static calculateDV(rutSinDV: string): string {
        rutSinDV = rutSinDV.replace(/\./g, '').replace(/-/g, '').trim();
        const rutNum = parseInt(rutSinDV, 10);
        if (!rutSinDV || isNaN(rutNum)) throw new Error('RUT inválido');

        let m = 0, s = 1, n = rutNum;
        for (; n !== 0; n = Math.floor(n / 10)) {
            s = (s + (n % 10) * (9 - (m++ % 6))) % 11;
        }

        return s !== 0 ? String.fromCharCode(s + 47) : 'K';
    }

    static isValid(rut: string): boolean {
        try {
            rut = rut.toUpperCase().replace(/\./g, '').replace(/-/g, '');
            const rutNum = parseInt(rut.substring(0, rut.length - 1), 10);
            if (isNaN(rutNum) || rutNum > 99999999) return false;

            const dv = rut[rut.length - 1];
            let m = 0, s = 1, n = rutNum;
            for (; n !== 0; n = Math.floor(n / 10)) {
                s = (s + (n % 10) * (9 - (m++ % 6))) % 11;
            }

            const expected = s !== 0 ? String.fromCharCode(s + 47) : 'K';
            return dv === expected;
        } catch {
            return false;
        }
    }

    static isCompanyRut(rut: string): boolean {
        if (!rut?.trim()) return false;
        const cleaned = rut.replace(/[^0-9kK]/g, '').toUpperCase();
        if (cleaned.length < 2) return false;

        const body = parseInt(cleaned.substring(0, cleaned.length - 1), 10);
        if (isNaN(body)) return false;

        return body < 1_000_000 || body > 50_000_000;
    }

    static create(rutSinDv: number): Rut {
        return new Rut(`${rutSinDv}-${Rut.calculateDV(String(rutSinDv))}`);
    }
}