export function Bind() {
    return function (target: any, propertyKey: string) {
        if (!target.propertiesToBind) {
            target.propertiesToBind = [];
        }

        target.propertiesToBind.push(propertyKey);
    }
}