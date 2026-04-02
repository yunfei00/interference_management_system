from django.http import JsonResponse
from django.template.loader import render_to_string


def render_modal_form(
    request,
    form,
    template="system/includes/modal_form.html",
    context_extra=None,
):
    context = {"form": form}
    if context_extra:
        context.update(context_extra)
    html = render_to_string(template, context, request=request)
    return JsonResponse({"html": html})
