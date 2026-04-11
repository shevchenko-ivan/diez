import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Дякуємо за реєстрацію!
              </CardTitle>
              <CardDescription>Перевірте вашу пошту</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Ми надіслали вам листа з підтвердженням. Перейдіть за посиланням
                у листі, щоб активувати акаунт.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
