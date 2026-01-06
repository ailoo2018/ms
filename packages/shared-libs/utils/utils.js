const crypto = require("crypto");

class FormatUtils{

    static calculateMD5(input) {
        return crypto.createHash('md5').update(input).digest('hex');
    }

    static isStringWholeNumber(str) {
        if (typeof str !== 'string') return false;
        if (str.trim() === '') return false;

        const num = Number(str);
        return !isNaN(num) && Number.isInteger(num) && isFinite(num);
    }

    static formatChileanRUT(rut) {
        // Remove all non-alphanumeric characters
        rut = rut.replace(/[^0-9kK]/g, '');

        // Ensure the RUT is valid
        if (rut.length < 2) {
            throw new Error('Invalid RUT: too short');
        }

        // Separate the verification digit
        let verificationDigit = rut.slice(-1).toUpperCase();
        let numbers = rut.slice(0, -1).replace(/^0+/, '');

        // Format the main part of the RUT
        let formattedRUT = '';
        while (numbers.length > 3) {
            formattedRUT = '.' + numbers.slice(-3) + formattedRUT;
            numbers = numbers.slice(0, -3);
        }
        formattedRUT = numbers + formattedRUT;

        // Add the verification digit
        return `${formattedRUT}-${verificationDigit}`;
    }

    static formatToCLP(number) {
        if(!number)
            return "$0";
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(number);
    }

    static formatPhoneNumber(phoneNumber, countryCode = '56') {
        if (!phoneNumber) return '';

        // Remove all non-digit characters
        phoneNumber = phoneNumber.replace(/\D/g, '');

        // Remove the country code if it's already present
        if (phoneNumber.startsWith(countryCode)) {
            phoneNumber = phoneNumber.slice(countryCode.length);
        }

        // Format the phone number
        let formatted = phoneNumber.replace(/(\d{1})(\d{4})(\d{4})/, '$1 $2 $3');

        // Add the country code
        return `+${countryCode} ${formatted}`;
    }

    static convertGuidToPath(guidString, width) {
        // Validate input types
        if (typeof guidString !== 'string' || typeof width !== 'number') {
            return "/Content/images/no-image_150.jpg"
        }

        // Validate guidString format
        const guidRegex = /^[0-9a-f]{32}\.[a-z]+$/i;
        if (!guidRegex.test(guidString)) {
            return "/Content/images/no-image_150.jpg"
        }

        // Validate width
        if (width <= 0 || !Number.isInteger(width)) {
            return "/Content/images/no-image_150.jpg"
        }

        // Split the string into guid and extension
        const [guid, extension] = guidString.split('.');

        // Extract the first two characters of the guid
        const firstChar = guid.charAt(0);
        const secondChar = guid.charAt(1);
        const thirdChar = guid.charAt(2);

        // Construct the new path
        const newPath = `/${firstChar}/${secondChar}${thirdChar}/${guid}_${width}.${extension}`;

        return newPath;
    }

}

module.exports.FormatUtils=FormatUtils;