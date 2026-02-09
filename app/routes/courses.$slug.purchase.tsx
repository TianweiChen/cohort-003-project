import { Link, useFetcher, redirect } from "react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";
import type { Route } from "./+types/courses.$slug.purchase";
import {
  getCourseBySlug,
  getCourseWithDetails,
  getLessonCountForCourse,
} from "~/services/courseService";
import { isUserEnrolled, enrollUser, getEnrollmentCountForCourse } from "~/services/enrollmentService";
import { getCurrentUserId } from "~/lib/session";
import { CourseStatus } from "~/db/schema";
import { Card, CardContent, CardHeader } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { BookOpen, Clock, Users, ArrowLeft } from "lucide-react";
import { CourseImage } from "~/components/course-image";
import { UserAvatar } from "~/components/user-avatar";
import { data } from "react-router";
import { formatDuration, formatPrice } from "~/lib/utils";
import { resolveCountry } from "~/lib/country.server";
import { calculatePppPrice, getCountryTierInfo, COUNTRIES } from "~/lib/ppp";
import { createPurchase } from "~/services/purchaseService";
import { parseFormData, parseParams } from "~/lib/validation";

const purchaseParamsSchema = z.object({
  slug: z.string().min(1),
});

const purchaseActionSchema = z.object({
  intent: z.literal("confirm-purchase"),
});

export function meta({ data: loaderData }: Route.MetaArgs) {
  const title = loaderData?.course?.title ?? "Purchase";
  return [
    { title: `Confirm Purchase: ${title} — Cadence` },
    { name: "description", content: `Confirm your enrollment in ${title}` },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const slug = params.slug;
  const course = getCourseBySlug(slug);

  if (!course) {
    throw data("Course not found.", { status: 404 });
  }

  if (course.status !== CourseStatus.Published) {
    throw data("Course not found.", { status: 404 });
  }

  const currentUserId = await getCurrentUserId(request);
  if (!currentUserId) {
    throw data("You must be logged in to purchase a course.", { status: 401 });
  }

  if (isUserEnrolled(currentUserId, course.id)) {
    throw redirect(`/courses/${slug}?already_enrolled=1`);
  }

  const courseWithDetails = getCourseWithDetails(course.id);
  if (!courseWithDetails) {
    throw data("Course not found.", { status: 404 });
  }

  const lessonCount = getLessonCountForCourse(course.id);
  const enrollmentCount = getEnrollmentCountForCourse(course.id);

  const totalDuration = courseWithDetails.modules.reduce(
    (sum, mod) =>
      sum + mod.lessons.reduce((s, l) => s + (l.durationMinutes ?? 0), 0),
    0
  );

  const country = await resolveCountry(request);
  const pppPrice = courseWithDetails.pppEnabled
    ? calculatePppPrice(courseWithDetails.price, country)
    : courseWithDetails.price;
  const tierInfo = getCountryTierInfo(country);
  const countryName = country
    ? COUNTRIES.find((c) => c.code === country)?.name ?? country
    : null;

  return {
    course: courseWithDetails,
    lessonCount,
    enrollmentCount,
    totalDuration,
    pppPrice,
    tierInfo,
    country,
    countryName,
  };
}

export async function action({ params, request }: Route.ActionArgs) {
  const { slug } = parseParams(params, purchaseParamsSchema);
  const course = getCourseBySlug(slug);

  if (!course) {
    throw data("Course not found.", { status: 404 });
  }

  const currentUserId = await getCurrentUserId(request);
  if (!currentUserId) {
    throw data("You must be logged in.", { status: 401 });
  }

  if (isUserEnrolled(currentUserId, course.id)) {
    throw redirect(`/courses/${slug}`);
  }

  const formData = await request.formData();
  const parsed = parseFormData(formData, purchaseActionSchema);

  if (!parsed.success) {
    throw data("Invalid action.", { status: 400 });
  }

  const country = await resolveCountry(request);
  const pppPrice = course.pppEnabled
    ? calculatePppPrice(course.price, country)
    : course.price;

  createPurchase(currentUserId, course.id, pppPrice, country);
  enrollUser(currentUserId, course.id, false, false);
  throw redirect(`/courses/${slug}/welcome`);
}

export default function PurchaseConfirmation({
  loaderData,
}: Route.ComponentProps) {
  const { course, lessonCount, enrollmentCount, totalDuration, pppPrice, tierInfo, countryName } = loaderData;
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.error) {
      toast.error(fetcher.data.error);
    }
  }, [fetcher.state, fetcher.data]);

  const isDiscounted = pppPrice < course.price;

  return (
    <div className="mx-auto max-w-3xl p-6 lg:p-8">
      {/* Back link */}
      <Link
        to={`/courses/${course.slug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to course
      </Link>

      <h1 className="mb-2 text-2xl font-bold">Confirm Your Purchase</h1>
      <p className="mb-8 text-muted-foreground">
        Review the details below before enrolling.
      </p>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Cover image */}
            <div className="w-full shrink-0 overflow-hidden rounded-lg sm:w-48">
              <CourseImage
                src={course.coverImageUrl}
                alt={course.title}
                className="aspect-video h-full w-full object-cover sm:aspect-auto"
              />
            </div>

            {/* Course info */}
            <div className="flex-1">
              <h2 className="mb-1 text-xl font-semibold">{course.title}</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                {course.description}
              </p>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserAvatar
                  name={course.instructorName}
                  avatarUrl={course.instructorAvatarUrl}
                  className="size-6"
                />
                <span>Taught by {course.instructorName}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 flex flex-wrap gap-6 border-t pt-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <BookOpen className="size-4" />
              {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
            </span>
            <span className="flex items-center gap-2">
              <Clock className="size-4" />
              {formatDuration(totalDuration, true, false, false)} total
            </span>
            <span className="flex items-center gap-2">
              <Users className="size-4" />
              {enrollmentCount}{" "}
              {enrollmentCount === 1 ? "student" : "students"} enrolled
            </span>
          </div>

          {/* Price + Confirm */}
          <div className="mt-6 border-t pt-6">
            {isDiscounted && countryName && (
              <div className="mb-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                <p className="text-sm text-green-800 dark:text-green-300">
                  PPP discount applied for {countryName} — {tierInfo.label}
                </p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                {isDiscounted ? (
                  <>
                    <span className="text-sm text-muted-foreground">Original price</span>
                    <div className="text-lg text-muted-foreground line-through">
                      {formatPrice(course.price)}
                    </div>
                    <span className="text-sm text-muted-foreground">Your price</span>
                    <div className="text-3xl font-bold">{formatPrice(pppPrice)}</div>
                  </>
                ) : (
                  <>
                    <span className="text-sm text-muted-foreground">Total</span>
                    <div className="text-3xl font-bold">{formatPrice(pppPrice)}</div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Link to={`/courses/${course.slug}`}>
                  <Button variant="outline">Go Back</Button>
                </Link>
                <fetcher.Form method="post">
                  <input
                    type="hidden"
                    name="intent"
                    value="confirm-purchase"
                  />
                  <Button size="lg" disabled={isSubmitting}>
                    {isSubmitting ? "Processing..." : "Confirm Purchase"}
                  </Button>
                </fetcher.Form>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
