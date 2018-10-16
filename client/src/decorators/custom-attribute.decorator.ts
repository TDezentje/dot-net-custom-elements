export function CustomAttribute() {
    return function (target: any, propertyKey: string) {
        if (!target.customAttributes) {
            target.customAttributes = [];
        }

        target.customAttributes.push(propertyKey);
    }
}